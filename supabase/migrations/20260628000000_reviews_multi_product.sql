-- Many-to-many between reviews and products.
--
-- Previously a review belonged to a single product via reviews.product_id, and
-- "posting to multiple products" duplicated the review row per product. This
-- junction table lets one review row link to many products. The legacy
-- reviews.product_id column is kept (nullable) for backward compatibility and
-- holds the first linked product as a fallback for older clients.
--
-- NOTE: RLS is intentionally NOT enabled here to match the existing reviews /
-- products tables (which have RLS disabled in this project). Enabling RLS is a
-- separate, project-wide decision.

create table if not exists public.review_products (
    review_id uuid not null references public.reviews(id) on delete cascade,
    product_id uuid not null references public.products(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (review_id, product_id)
);

create index if not exists review_products_product_id_idx
    on public.review_products(product_id);

create index if not exists review_products_review_id_idx
    on public.review_products(review_id);

-- Backfill links from the legacy single product_id column.
insert into public.review_products (review_id, product_id)
select id, product_id
from public.reviews
where product_id is not null
on conflict do nothing;
