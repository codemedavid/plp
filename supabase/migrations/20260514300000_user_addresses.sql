-- User addresses book (Shopee-style)
-- Multiple saved shipping addresses per user with exactly one primary.

CREATE TABLE IF NOT EXISTS user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT,
  recipient_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  barangay TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id);

-- Only one primary address per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_addresses_one_primary
  ON user_addresses(user_id)
  WHERE is_primary = TRUE;

ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own addresses" ON user_addresses;
CREATE POLICY "Users can view own addresses" ON user_addresses
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own addresses" ON user_addresses;
CREATE POLICY "Users can insert own addresses" ON user_addresses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own addresses" ON user_addresses;
CREATE POLICY "Users can update own addresses" ON user_addresses
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own addresses" ON user_addresses;
CREATE POLICY "Users can delete own addresses" ON user_addresses
  FOR DELETE USING (auth.uid() = user_id);

-- When setting an address primary, clear primary flag on others.
CREATE OR REPLACE FUNCTION enforce_single_primary_address() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = TRUE THEN
    UPDATE user_addresses
       SET is_primary = FALSE,
           updated_at = NOW()
     WHERE user_id = NEW.user_id
       AND id <> NEW.id
       AND is_primary = TRUE;
  END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_single_primary_address ON user_addresses;
CREATE TRIGGER trg_enforce_single_primary_address
  BEFORE INSERT OR UPDATE ON user_addresses
  FOR EACH ROW EXECUTE FUNCTION enforce_single_primary_address();
