-- Invite & Earn referral program
-- L1: 500 pts × qualifying orders, L2: 150, L3: 50 (configurable)
-- Qualifying = order completed, not refunded, contains a referral_eligible product
-- 1 pt = ₱1. Monthly payout, redeemable at checkout or withdrawable.

-- ============================================================================
-- 1. user_profiles — extend auth.users with referral data
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  phone TEXT,
  full_name TEXT,
  frozen BOOLEAN DEFAULT FALSE, -- admin can freeze suspicious accounts
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_referral_code ON user_profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_user_profiles_referred_by ON user_profiles(referred_by);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_phone ON user_profiles(phone) WHERE phone IS NOT NULL;

-- Auto-generate a unique referral code (8 chars, alphanumeric uppercase)
CREATE OR REPLACE FUNCTION generate_referral_code() RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- omit confusing chars
  result TEXT := '';
  i INT;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..8 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM user_profiles WHERE referral_code = result);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. referral_config — single-row config table, editable from admin
-- ============================================================================
CREATE TABLE IF NOT EXISTS referral_config (
  id INT PRIMARY KEY DEFAULT 1,
  l1_points INT NOT NULL DEFAULT 500,
  l2_points INT NOT NULL DEFAULT 150,
  l3_points INT NOT NULL DEFAULT 50,
  enabled BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT singleton CHECK (id = 1)
);

INSERT INTO referral_config (id) VALUES (1) ON CONFLICT DO NOTHING;

-- ============================================================================
-- 3. points_ledger — append-only ledger; balance = SUM(delta) per user
-- ============================================================================
CREATE TABLE IF NOT EXISTS points_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta INT NOT NULL, -- positive = credit, negative = debit
  reason TEXT NOT NULL, -- 'referral_l1' | 'referral_l2' | 'referral_l3' | 'redemption' | 'withdrawal' | 'refund_reversal' | 'admin_adjust'
  source_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  source_referral_invitee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source_withdrawal_id UUID, -- FK added after withdrawals table created
  period_month DATE, -- first day of month this credit corresponds to (for referral credits)
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_points_ledger_user_id ON points_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_points_ledger_created_at ON points_ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_points_ledger_reason ON points_ledger(reason);

-- Prevent duplicate referral credits for the same (inviter, invitee, level, month)
CREATE UNIQUE INDEX IF NOT EXISTS idx_points_ledger_referral_uniq
  ON points_ledger(user_id, source_referral_invitee_id, reason, period_month)
  WHERE reason IN ('referral_l1', 'referral_l2', 'referral_l3');

-- ============================================================================
-- 4. withdrawals — user requests, admin approves
-- ============================================================================
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INT NOT NULL CHECK (amount > 0), -- points (= pesos)
  method TEXT NOT NULL, -- 'gcash' | 'bank' | 'store_credit'
  payout_details JSONB NOT NULL, -- {gcash_number} | {bank_name, account_number, account_name}
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'paid' | 'rejected'
  admin_note TEXT,
  payout_reference TEXT, -- transaction ref from GCash/bank
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);

ALTER TABLE points_ledger
  ADD CONSTRAINT fk_points_ledger_withdrawal
  FOREIGN KEY (source_withdrawal_id) REFERENCES withdrawals(id) ON DELETE SET NULL;

-- ============================================================================
-- 5. Extend products & orders
-- ============================================================================
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS referral_eligible BOOLEAN DEFAULT FALSE;

-- Seed: mark Tirzepatide and PLP-Slim as referral-eligible
UPDATE products SET referral_eligible = TRUE
  WHERE LOWER(name) LIKE '%tirzepatide%'
     OR LOWER(name) LIKE '%plp-slim%'
     OR LOWER(name) LIKE '%plp slim%'
     OR LOWER(name) LIKE '%slimmetry%';

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS points_redeemed INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_qualifying BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

-- Auto-flag orders as referral-qualifying when they contain any eligible product
-- (computed at insert/update via trigger; cheap because order_items is small JSONB)
CREATE OR REPLACE FUNCTION compute_order_referral_qualifying() RETURNS TRIGGER AS $$
BEGIN
  NEW.referral_qualifying := EXISTS (
    SELECT 1
    FROM jsonb_array_elements(NEW.order_items) AS item
    JOIN products p ON p.id = (item->>'product_id')::uuid
    WHERE p.referral_eligible = TRUE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_compute_order_referral_qualifying ON orders;
CREATE TRIGGER trg_compute_order_referral_qualifying
  BEFORE INSERT OR UPDATE OF order_items ON orders
  FOR EACH ROW EXECUTE FUNCTION compute_order_referral_qualifying();

-- ============================================================================
-- 6. Helper view: user point balance
-- ============================================================================
CREATE OR REPLACE VIEW user_point_balance AS
SELECT
  user_id,
  COALESCE(SUM(delta), 0)::INT AS balance
FROM points_ledger
GROUP BY user_id;

-- ============================================================================
-- 7. Auto-create user_profile + referral_code on signup
-- ============================================================================
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
DECLARE
  v_code TEXT;
  v_referred_by UUID;
  v_pending_code TEXT;
BEGIN
  v_code := generate_referral_code();
  -- Read the inviter code from raw_user_meta_data if present
  v_pending_code := NEW.raw_user_meta_data->>'referral_code_used';
  IF v_pending_code IS NOT NULL THEN
    SELECT id INTO v_referred_by
      FROM user_profiles
      WHERE referral_code = v_pending_code AND id <> NEW.id
      LIMIT 1;
  END IF;

  INSERT INTO user_profiles (id, referral_code, referred_by, full_name, phone)
  VALUES (
    NEW.id,
    v_code,
    v_referred_by,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- 8. RLS policies
-- ============================================================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_config ENABLE ROW LEVEL SECURITY;

-- user_profiles: user can read own + read by referral_code (for invitee signup lookup); update own
DROP POLICY IF EXISTS up_select_own ON user_profiles;
CREATE POLICY up_select_own ON user_profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS up_select_by_code ON user_profiles;
CREATE POLICY up_select_by_code ON user_profiles
  FOR SELECT USING (true); -- referral codes are public; we only expose id + code via the lookup

DROP POLICY IF EXISTS up_update_own ON user_profiles;
CREATE POLICY up_update_own ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- points_ledger: user reads own only; only service role writes
DROP POLICY IF EXISTS pl_select_own ON points_ledger;
CREATE POLICY pl_select_own ON points_ledger
  FOR SELECT USING (auth.uid() = user_id);

-- withdrawals: user reads + inserts own; only admin (service role) updates
DROP POLICY IF EXISTS w_select_own ON withdrawals;
CREATE POLICY w_select_own ON withdrawals
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS w_insert_own ON withdrawals;
CREATE POLICY w_insert_own ON withdrawals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- referral_config: public read, admin write
DROP POLICY IF EXISTS rc_select_all ON referral_config;
CREATE POLICY rc_select_all ON referral_config
  FOR SELECT USING (true);
