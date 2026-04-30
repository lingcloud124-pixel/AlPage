const SUPPORTED_EXPORT_PRODUCTS = new Set([
  'mk',
  'ekp_v14',
  'ekp_v15',
  'ekp_v16',
  'ekp_v17',
]);

export function normalizeAndValidateSelectedProducts(rawProducts: unknown): {
  products?: string[];
  error?: string;
} {
  if (!Array.isArray(rawProducts) || rawProducts.length === 0) {
    return { error: 'selectedProducts 不能为空' };
  }

  const products = Array.from(new Set(rawProducts.filter((value): value is string => typeof value === 'string').map((value) => value.trim()).filter(Boolean)));
  if (products.length === 0) {
    return { error: 'selectedProducts 不能为空' };
  }

  const invalid = products.find((product) => !SUPPORTED_EXPORT_PRODUCTS.has(product));
  if (invalid) {
    return { error: `selectedProducts 包含不支持的产品: ${invalid}` };
  }

  return { products };
}
