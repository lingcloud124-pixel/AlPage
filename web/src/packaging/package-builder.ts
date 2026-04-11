import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const SAMPLES_BASE = '/../assets/references/samples/主题样例包';

const COLOR_VARIANTS = [
  '#144e48', '#2c615c', '#36706a', '#56817d', '#228077', '#b72217', '#c92d24',
];

const BG_VARIANTS = ['#fbfcf2', '#fbf9eb'];

const HEADER_FONT_REPLACEMENTS = [
  '$header-font-color:#333;',
  '$header-font-color:#333333;',
  '$header-font-color: #333;',
  '$header-font-color: #333333;',
  '$portal-header-font-color:#333;',
  '$portal-header-font-color: #333;',
  '$tlayout-header-font-color:#333;',
  '$tlayout-header-font-color: #333;',
  '$single-header-font-color:#333;',
  '$single-header-font-color: #333;',
  '$tabpage-header-font-color:#333;',
  '$tabpage-header-font-color: #333;',
];

const ORIGINAL_RGB = [
  ['255, 134, 36', '255,134,36'],
  ['20, 78, 72', '20,78,72'],
  ['44, 97, 92', '44,97,92'],
];

const TEMPLATE_ZIPS: Record<string, { theme?: string; login?: string; loginVariants?: Array<{ label: string; template: string }> }> = {
  mk: {
    theme: '主题-MK-2026清明主题.zip',
    login: '登录-MK-2026清明.zip',
  },
  ekp_v12: {
    theme: '主题-V12-2026清明主题.zip',
    login: '登录-V12-2026清明.zip',
  },
  ekp_v13_5: {
    theme: '主题-V13〜V13.5-2026清明主题.zip',
    loginVariants: [
      { label: 'V13', template: '登录-V13-2026清明.zip' },
      { label: 'V13.5', template: '登录-V13.5-2026清明.zip' },
    ],
  },
  ekp_v14_16: {
    theme: '主题-V14〜V16-2026清明主题.zip',
    loginVariants: [
      { label: 'V14', template: '登录-V14-2026清明.zip' },
      { label: 'V15', template: '登录-V15-2026清明.zip' },
      { label: 'V16', template: '登录-V16-2026清明.zip' },
    ],
  },
  ekp_v17: {
    theme: '主题-V17-2026清明主题.zip',
    login: '登录-V17-2026清明.zip',
  },
};

interface BuildConfig {
  title: string;
  subtitle: string;
  buttonText: string;
  themeColor: string;
  headerFont: string;
  products: string[];
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.substring(0, 2), 16),
    parseInt(clean.substring(2, 4), 16),
    parseInt(clean.substring(4, 6), 16),
  ];
}

function injectColorIntoCss(content: string, themeColor: string, headerFont: string): string {
  let result = content;

  for (const variant of COLOR_VARIANTS) {
    result = result.replaceAll(variant.toLowerCase(), themeColor.toLowerCase());
    result = result.replaceAll(variant.toUpperCase(), themeColor.toUpperCase());
  }

  for (const variant of BG_VARIANTS) {
    result = result.replaceAll(variant.toLowerCase(), headerFont.toLowerCase());
    result = result.replaceAll(variant.toUpperCase(), headerFont.toUpperCase());
  }

  const rgb = hexToRgb(themeColor);
  const rgbStr = `${rgb[0]},${rgb[1]},${rgb[2]}`;
  for (const patterns of ORIGINAL_RGB) {
    for (const pattern of patterns) {
      result = result.replaceAll(pattern, rgbStr);
    }
  }

  for (const old of HEADER_FONT_REPLACEMENTS) {
    const newStr = old.replace('#333;', `${headerFont};`).replace('#333333;', `${headerFont};`);
    result = result.replaceAll(old, newStr);
  }

  return result;
}

function updateJsonLocale(obj: any, key: string, value: string): void {
  if (!obj || typeof obj !== 'object') return;
  for (const k of Object.keys(obj)) {
    if (k === key) {
      if (typeof obj[k] === 'string') {
        obj[k] = value;
      } else if (typeof obj[k] === 'object') {
        const localeObj = obj[k];
        for (const lk of Object.keys(localeObj)) {
          if (typeof localeObj[lk] === 'string') {
            localeObj[lk] = value;
          }
        }
      }
    } else if (typeof obj[k] === 'object') {
      updateJsonLocale(obj[k], key, value);
    }
  }
}

async function fetchSampleZip(filename: string): Promise<ArrayBuffer | null> {
  try {
    const response = await fetch(`${SAMPLES_BASE}/${encodeURIComponent(filename)}`);
    if (!response.ok) return null;
    return await response.arrayBuffer();
  } catch {
    return null;
  }
}

async function processZip(
  zipData: ArrayBuffer,
  config: BuildConfig,
  label: string,
): Promise<Blob | null> {
  try {
    const zip = await JSZip.loadAsync(zipData);
    const folderName = Object.keys(zip.files).find(f => f.endsWith('/') && !f.startsWith('__')) || '';

    for (const [path, file] of Object.entries(zip.files)) {
      if (file.dir) continue;

      if (path.endsWith('config.json') || path.includes('/config.json')) {
        const content = await file.async('string');
        try {
          const json = JSON.parse(content);
          updateJsonLocale(json, 'loginTitle', config.title);
          updateJsonLocale(json, 'loginTitleDesc', config.subtitle);
          updateJsonLocale(json, 'loginBtnText', config.buttonText);
          zip.file(path, JSON.stringify(json, null, 2) + '\n');
        } catch {}
      }

      if (path.endsWith('.css') || path.endsWith('.scss')) {
        const content = await file.async('string');
        const modified = injectColorIntoCss(content, config.themeColor, config.headerFont);
        zip.file(path, modified);
      }

      if (path.endsWith('theme.xml') || path.endsWith('data.json')) {
        const content = await file.async('string');
        let modified = content.replaceAll('$loginTitle$', config.title);
        modified = modified.replaceAll('$loginBtnText$', config.buttonText);
        zip.file(path, modified);
      }
    }

    return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  } catch (e) {
    console.error(`Failed to process ${label}:`, e);
    return null;
  }
}

export async function buildPackages(config: BuildConfig): Promise<Array<{ label: string; blob: Blob }>> {
  const results: Array<{ label: string; blob: Blob }> = [];
  const title = config.title || '未命名主题';

  for (const productKey of config.products) {
    const templateConfig = TEMPLATE_ZIPS[productKey];
    if (!templateConfig) continue;

    if (templateConfig.theme) {
      const zipData = await fetchSampleZip(templateConfig.theme);
      if (zipData) {
        const blob = await processZip(zipData, config, `${productKey} theme`);
        if (blob) {
          results.push({ label: `主题-${templateConfig.theme.split('-').slice(1).join('-').replace('.zip', '')}-${title}`, blob });
        }
      }
    }

    if (templateConfig.login) {
      const zipData = await fetchSampleZip(templateConfig.login);
      if (zipData) {
        const blob = await processZip(zipData, config, `${productKey} login`);
        if (blob) {
          results.push({ label: `登录-${templateConfig.login.split('-').slice(1).join('-').replace('.zip', '')}-${title}`, blob });
        }
      }
    }

    if (templateConfig.loginVariants) {
      for (const variant of templateConfig.loginVariants) {
        const zipData = await fetchSampleZip(variant.template);
        if (zipData) {
          const blob = await processZip(zipData, config, `${productKey} login ${variant.label}`);
          if (blob) {
            results.push({ label: `登录-${variant.template.split('-').slice(1).join('-').replace('.zip', '')}-${title}`, blob });
          }
        }
      }
    }
  }

  return results;
}

export function downloadPackage(label: string, blob: Blob): void {
  saveAs(blob, `${label}.zip`);
}
