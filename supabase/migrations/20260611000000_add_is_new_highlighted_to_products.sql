-- Adds badge/highlight flags editable from the admin product form:
--   is_new      -> shows a "NEW" badge on the product card
--   highlighted -> pulsing glow + "Buy Now" treatment on the product card
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_new boolean NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS highlighted boolean NOT NULL DEFAULT false;
