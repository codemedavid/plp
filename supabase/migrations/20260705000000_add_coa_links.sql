-- Add named Certificate of Analysis (COA) links to products.
-- Supersedes the single `coa_url` column (kept as a fallback) so a product can
-- carry multiple labeled lab documents (e.g. Purity Test, Heavy Metal Testing).

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS coa_links jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Seed the two Janoshik reports for the standalone Tirzepatide 30mg product.
-- Scope carefully: the store also has "PLP-Slim 2.0 (Tirzepatide 30mg +
-- Cagrilintide 5mg)", a different product with its own COA — so exclude any
-- Cagrilintide combo. Only touches rows without COA links set, so re-running or
-- later admin edits are never overwritten.
UPDATE products
SET coa_links = '[
  {"label": "Purity Test", "url": "https://verify.janoshik.com/tests/113255-Tirzepatide_30mg_M6J942Z5BHLG"},
  {"label": "Heavy Metal Testing", "url": "https://verify.janoshik.com/tests/113135-Tirzepatide_30mg_BES6MLPYQCK4"}
]'::jsonb
WHERE name ILIKE '%tirzepatide 30mg%'
  AND name NOT ILIKE '%cagrilintide%'
  AND (coa_links IS NULL OR coa_links = '[]'::jsonb);
