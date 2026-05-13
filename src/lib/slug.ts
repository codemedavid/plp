export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function findProductBySlug<T extends { name: string }>(products: T[], slug: string): T | undefined {
  const target = slug.toLowerCase();
  return products.find((p) => slugify(p.name) === target);
}
