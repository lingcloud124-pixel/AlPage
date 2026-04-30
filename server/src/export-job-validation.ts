const SUPPORTED_EXPORT_PRODUCTS = new Set([
  'mk',
  'ekp_v14',
  'ekp_v15',
  'ekp_v16',
  'ekp_v17',
]);

export const MAX_EXPORT_SNAPSHOT_BYTES = 2 * 1024 * 1024;

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

export function validateExportSnapshotSize(snapshot: unknown): {
  ok: boolean;
  error?: string;
  bytes?: number;
} {
  if (!snapshot || typeof snapshot !== 'object') {
    return { ok: false, error: 'projectSnapshot 必须是对象' };
  }

  const serialized = JSON.stringify(snapshot);
  const bytes = Buffer.byteLength(serialized, 'utf8');
  if (bytes > MAX_EXPORT_SNAPSHOT_BYTES) {
    return {
      ok: false,
      error: `projectSnapshot 体积超过限制（${MAX_EXPORT_SNAPSHOT_BYTES} bytes）`,
      bytes,
    };
  }

  return { ok: true, bytes };
}
