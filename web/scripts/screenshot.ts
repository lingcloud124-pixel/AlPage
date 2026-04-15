import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const PROJECT_ROOT = path.resolve(import.meta.dirname, '../..');
const WEB_ROOT = path.resolve(import.meta.dirname, '..');

interface ScreenshotOptions {
  cssVariables?: Record<string, string>;
  themeImageUrl?: string;
  templateType?: 'light-ui' | 'dark-ui';
  themeColor?: string;
}

interface DerivedImageTask {
  outputFile: string;
}

type TemplateType = 'light-ui' | 'dark-ui';

type AssetFormat = 'png' | 'jpeg';

interface AssetSpec {
  name: string;
  width: number;
  height: number;
  format: AssetFormat;
  kind: 'background' | 'header' | 'sidebar' | 'thumbnail';
  variant?: 'default' | 'complex' | 'menu' | 'banner' | 'loginThumb' | 'desktop' | 'layout';
}

interface ThemePalette {
  primary: string;
  panelBg: string;
  gradientStart: string;
  gradientMid: string;
  headerFont: string;
  sidebarPanelBg: string;
  bodyBg: string;
  borderColor: string;
}

interface SandwichStyle {
  baseColor: string;
  gradientDirection: 'horizontal' | 'vertical';
  alphaStart: number;
  alphaEnd: number;
  imageOpacity: number;
}

const DEFAULT_THEME_IMAGES: Record<TemplateType, string> = {
  'light-ui': path.join(WEB_ROOT, 'public', 'backgrounds', 'qingming-bg.png'),
  'dark-ui': path.join(WEB_ROOT, 'public', 'backgrounds', 'panda-night-bg.png'),
};

const ASSET_SPECS: Record<TemplateType, AssetSpec[]> = {
  'light-ui': [
    { name: 'bg-login', width: 2215, height: 1080, format: 'jpeg', kind: 'background' },
    { name: 'login_thumb', width: 960, height: 540, format: 'jpeg', kind: 'thumbnail', variant: 'loginThumb' },
    { name: 'header_tlayout_frame_bg', width: 1920, height: 60, format: 'png', kind: 'header', variant: 'default' },
    { name: 'header_complex_frame_bg', width: 1920, height: 90, format: 'png', kind: 'header', variant: 'complex' },
    { name: 'header_menu_frame_bg', width: 1920, height: 130, format: 'png', kind: 'header', variant: 'menu' },
    { name: 'header-banner', width: 2560, height: 480, format: 'png', kind: 'header', variant: 'banner' },
    { name: 'header-sideheader', width: 200, height: 900, format: 'png', kind: 'sidebar' },
    { name: 'header_simple_frame_bg', width: 1920, height: 60, format: 'png', kind: 'header', variant: 'default' },
    { name: 'header_zone_frame_bg', width: 1920, height: 60, format: 'png', kind: 'header', variant: 'default' },
    { name: 'header_zone_nav_frame_bg', width: 1920, height: 60, format: 'png', kind: 'header', variant: 'default' },
    { name: 'header_single_menu_frame_bg', width: 200, height: 900, format: 'png', kind: 'sidebar' },
    { name: 'desktop', width: 1440, height: 800, format: 'png', kind: 'thumbnail', variant: 'desktop' },
    { name: 'layout-banner', width: 1600, height: 572, format: 'jpeg', kind: 'thumbnail', variant: 'layout' },
    { name: 'fullscreen-sideheader', width: 1600, height: 572, format: 'jpeg', kind: 'thumbnail', variant: 'layout' },
    { name: 'fullscreen-sidenav', width: 1600, height: 572, format: 'jpeg', kind: 'thumbnail', variant: 'layout' },
    { name: 'center-sidenav', width: 1600, height: 572, format: 'jpeg', kind: 'thumbnail', variant: 'layout' },
  ],
  'dark-ui': [
    { name: 'bg-login', width: 2215, height: 1080, format: 'jpeg', kind: 'background' },
    { name: 'login_thumb', width: 960, height: 540, format: 'jpeg', kind: 'thumbnail', variant: 'loginThumb' },
    { name: 'header_tlayout_frame_bg', width: 1920, height: 60, format: 'png', kind: 'header', variant: 'default' },
    { name: 'header_complex_frame_bg', width: 1920, height: 90, format: 'png', kind: 'header', variant: 'complex' },
    { name: 'header_menu_frame_bg', width: 1920, height: 130, format: 'png', kind: 'header', variant: 'menu' },
    { name: 'header-banner', width: 2560, height: 480, format: 'png', kind: 'header', variant: 'banner' },
    { name: 'header-sideheader', width: 200, height: 488, format: 'png', kind: 'sidebar' },
    { name: 'header_simple_frame_bg', width: 1920, height: 60, format: 'png', kind: 'header', variant: 'default' },
    { name: 'header_zone_frame_bg', width: 1920, height: 60, format: 'png', kind: 'header', variant: 'default' },
    { name: 'header_zone_nav_frame_bg', width: 1920, height: 60, format: 'png', kind: 'header', variant: 'default' },
    { name: 'header_single_menu_frame_bg', width: 200, height: 488, format: 'png', kind: 'sidebar' },
    { name: 'desktop', width: 1440, height: 800, format: 'png', kind: 'thumbnail', variant: 'desktop' },
    { name: 'layout-banner', width: 1600, height: 572, format: 'jpeg', kind: 'thumbnail', variant: 'layout' },
    { name: 'fullscreen-sideheader', width: 1600, height: 572, format: 'jpeg', kind: 'thumbnail', variant: 'layout' },
    { name: 'fullscreen-sidenav', width: 1600, height: 572, format: 'jpeg', kind: 'thumbnail', variant: 'layout' },
    { name: 'center-sidenav', width: 1600, height: 572, format: 'jpeg', kind: 'thumbnail', variant: 'layout' },
  ],
};

function normalizeCssVariableAssignments(cssVariables: Record<string, string> = {}): Record<string, string> {
  return Object.fromEntries(
    Object.entries(cssVariables)
      .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
      .map(([name, value]) => [name.startsWith('--') ? name : `--${name}`, value]),
  );
}

function buildOutputPath(outputDir: string, name: string, format: AssetFormat): string {
  const ext = format === 'jpeg' ? 'jpg' : 'png';
  return path.join(outputDir, `${name}.${ext}`);
}

function withAlpha(hexColor: string, alpha: number): string {
  const normalized = hexColor.trim();
  if (normalized.startsWith('rgba(') || normalized.startsWith('rgb(') || normalized.startsWith('hsla(') || normalized.startsWith('hsl(')) {
    return normalized;
  }

  const hex = normalized.replace('#', '');
  const safe = hex.length === 3
    ? hex.split('').map((char) => `${char}${char}`).join('')
    : hex.padEnd(6, '0').slice(0, 6);

  const red = Number.parseInt(safe.slice(0, 2), 16);
  const green = Number.parseInt(safe.slice(2, 4), 16);
  const blue = Number.parseInt(safe.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function getPalette(cssVariables: Record<string, string>, themeColor?: string): ThemePalette {
  return {
    primary: cssVariables['--primary-color'] ?? themeColor ?? '#2C615C',
    panelBg: cssVariables['--panel-bg-color'] ?? '#FFFFFF',
    gradientStart: cssVariables['--gradient-start'] ?? withAlpha(cssVariables['--primary-color'] ?? themeColor ?? '#2C615C', 0.92),
    gradientMid: cssVariables['--gradient-mid'] ?? withAlpha(cssVariables['--primary-color'] ?? themeColor ?? '#2C615C', 0.45),
    headerFont: cssVariables['--header-font-color'] ?? '#333333',
    sidebarPanelBg: cssVariables['--sidebar-panel-bg'] ?? '#FBF4EE',
    bodyBg: cssVariables['--body-bg-color'] ?? '#F8F8F8',
    borderColor: cssVariables['--border-color'] ?? 'rgba(0, 0, 0, 0.08)',
  };
}

async function resolveSourceImageBuffer(themeImageUrl: string | undefined, templateType: TemplateType): Promise<Buffer> {
  const resolved = themeImageUrl?.trim() ? themeImageUrl.trim() : DEFAULT_THEME_IMAGES[templateType];

  if (/^https?:\/\//i.test(resolved)) {
    const response = await fetch(resolved);
    if (!response.ok) throw new Error(`无法下载背景图: ${resolved}`);
    return Buffer.from(await response.arrayBuffer());
  }

  const candidates = [
    resolved,
    path.isAbsolute(resolved) ? null : path.join(PROJECT_ROOT, resolved),
    path.isAbsolute(resolved) ? null : path.join(WEB_ROOT, resolved),
    resolved.startsWith('/')
      ? path.join(WEB_ROOT, 'public', resolved.replace(/^\//, ''))
      : null,
    path.join(WEB_ROOT, 'public', resolved.replace(/^\//, '')),
  ].filter((value): value is string => !!value);

  const matched = candidates.find((candidate) => fs.existsSync(candidate));
  if (!matched) throw new Error(`无法定位背景图: ${resolved}`);
  return fs.readFileSync(matched);
}

function buildSvgOverlay(width: number, height: number, markup: string): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${markup}</svg>`,
  );
}

function buildSolidLayer(width: number, height: number, color: string): Buffer {
  return buildSvgOverlay(width, height, `<rect width="${width}" height="${height}" fill="${color}" />`);
}

function buildGradientOverlay(
  width: number,
  height: number,
  color: string,
  direction: 'horizontal' | 'vertical',
  alphaStart: number,
  alphaEnd: number,
): Buffer {
  const gradientVector = direction === 'vertical'
    ? 'x1="0" y1="0" x2="0" y2="1"'
    : 'x1="0" y1="0" x2="1" y2="0"';

  return buildSvgOverlay(
    width,
    height,
    `
      <defs>
        <linearGradient id="sandwichGradient" ${gradientVector}>
          <stop offset="0%" stop-color="${withAlpha(color, alphaStart)}" />
          <stop offset="100%" stop-color="${withAlpha(color, alphaEnd)}" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#sandwichGradient)" />
    `,
  );
}

function getSandwichStyle(spec: AssetSpec, palette: ThemePalette): SandwichStyle {
  if (spec.kind === 'sidebar') {
    return {
      baseColor: palette.sidebarPanelBg,
      gradientDirection: 'vertical',
      alphaStart: 1,
      alphaEnd: 0.7,
      imageOpacity: spec.name.includes('single_menu') ? 0.1 : 0.16,
    };
  }

  if (spec.kind === 'background') {
    return {
      baseColor: palette.primary,
      gradientDirection: 'horizontal',
      alphaStart: 0.15,
      alphaEnd: 0.05,
      imageOpacity: 1,
    };
  }

  if (spec.variant === 'loginThumb') {
    return {
      baseColor: palette.primary,
      gradientDirection: 'horizontal',
      alphaStart: 0.48,
      alphaEnd: 0.18,
      imageOpacity: 0.92,
    };
  }

  if (spec.variant === 'desktop' || spec.variant === 'layout') {
    return {
      baseColor: palette.bodyBg,
      gradientDirection: 'horizontal',
      alphaStart: 0.2,
      alphaEnd: 0.08,
      imageOpacity: 0.86,
    };
  }

  if (spec.variant === 'banner') {
    return {
      baseColor: palette.panelBg,
      gradientDirection: 'horizontal',
      alphaStart: 0.22,
      alphaEnd: 0.12,
      imageOpacity: 0.72,
    };
  }

  return {
    baseColor: palette.primary,
    gradientDirection: 'horizontal',
    alphaStart: spec.variant === 'menu' ? 0.92 : spec.variant === 'complex' ? 0.86 : 0.8,
    alphaEnd: spec.variant === 'menu' ? 0.68 : spec.variant === 'complex' ? 0.58 : 0.52,
    imageOpacity: spec.variant === 'menu' ? 0.26 : spec.variant === 'complex' ? 0.22 : 0.18,
  };
}

function buildHeaderOverlay(spec: AssetSpec, palette: ThemePalette): Buffer {
  if (spec.variant === 'banner') {
    return buildSvgOverlay(
      spec.width,
      spec.height,
      `
        <defs>
          <radialGradient id="bannerGlow" cx="52%" cy="38%" r="58%">
            <stop offset="0%" stop-color="${withAlpha(palette.panelBg, 0.72)}" />
            <stop offset="62%" stop-color="${withAlpha(palette.panelBg, 0.18)}" />
            <stop offset="100%" stop-color="${withAlpha(palette.primary, 0)}" />
          </radialGradient>
          <linearGradient id="bannerShade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${withAlpha('#000000', 0.12)}" />
            <stop offset="100%" stop-color="${withAlpha('#000000', 0.4)}" />
          </linearGradient>
        </defs>
        <rect width="${spec.width}" height="${spec.height}" fill="url(#bannerGlow)" />
        <rect width="${spec.width}" height="${spec.height}" fill="url(#bannerShade)" />
      `,
    );
  }

  const topAlpha = spec.variant === 'complex' ? 0.28 : spec.variant === 'menu' ? 0.34 : 0.22;
  const bottomAlpha = spec.variant === 'menu' ? 0.1 : 0.04;

  return buildSvgOverlay(
    spec.width,
    spec.height,
    `
      <defs>
        <linearGradient id="topGlow" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${withAlpha(palette.gradientStart, topAlpha)}" />
          <stop offset="50%" stop-color="${withAlpha(palette.gradientMid, topAlpha * 0.82)}" />
          <stop offset="100%" stop-color="${withAlpha(palette.gradientStart, 0)}" />
        </linearGradient>
        <linearGradient id="surface" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${withAlpha(palette.panelBg, 0.2)}" />
          <stop offset="100%" stop-color="${withAlpha(palette.panelBg, bottomAlpha)}" />
        </linearGradient>
      </defs>
      <rect width="${spec.width}" height="${spec.height}" fill="url(#surface)" />
      <rect width="${spec.width}" height="${spec.height}" fill="url(#topGlow)" />
    `,
  );
}

function buildSidebarOverlay(spec: AssetSpec, palette: ThemePalette): Buffer {
  return buildSvgOverlay(
    spec.width,
    spec.height,
    `
      <defs>
        <linearGradient id="sidePanel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${withAlpha(palette.sidebarPanelBg, 0.26)}" />
          <stop offset="100%" stop-color="${withAlpha(palette.panelBg, 0.12)}" />
        </linearGradient>
      </defs>
      <rect width="${spec.width}" height="${spec.height}" fill="url(#sidePanel)" />
      <rect x="0" y="0" width="1" height="${spec.height}" fill="${withAlpha(palette.borderColor, 0.65)}" />
      <rect x="${spec.width - 1}" y="0" width="1" height="${spec.height}" fill="${withAlpha(palette.borderColor, 0.65)}" />
    `,
  );
}

function buildDesktopOverlay(spec: AssetSpec, palette: ThemePalette): Buffer {
  const panelWidth = Math.round(spec.width * 0.28);
  return buildSvgOverlay(
    spec.width,
    spec.height,
    `
      <defs>
        <linearGradient id="desktopShade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${withAlpha(palette.bodyBg, 0.08)}" />
          <stop offset="100%" stop-color="${withAlpha(palette.bodyBg, 0.18)}" />
        </linearGradient>
        <linearGradient id="panelLight" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${withAlpha(palette.panelBg, 0.72)}" />
          <stop offset="100%" stop-color="${withAlpha(palette.panelBg, 0.18)}" />
        </linearGradient>
      </defs>
      <rect width="${spec.width}" height="${spec.height}" fill="url(#desktopShade)" />
      <rect x="0" y="0" width="${panelWidth}" height="${spec.height}" fill="url(#panelLight)" />
      <rect x="0" y="0" width="${spec.width}" height="${Math.max(60, Math.round(spec.height * 0.12))}" fill="${withAlpha(palette.primary, 0.14)}" />
    `,
  );
}

async function renderBaseAsset(
  sourceBuffer: Buffer,
  spec: AssetSpec,
  palette: ThemePalette,
  outputPath: string,
): Promise<void> {
  const sandwichStyle = getSandwichStyle(spec, palette);
  const baseLayer = buildSolidLayer(spec.width, spec.height, sandwichStyle.baseColor);
  const gradientLayer = buildGradientOverlay(
    spec.width,
    spec.height,
    sandwichStyle.baseColor,
    sandwichStyle.gradientDirection,
    sandwichStyle.alphaStart,
    sandwichStyle.alphaEnd,
  );

  const resizedSource = await sharp(sourceBuffer)
    .resize(spec.width, spec.height, {
      fit: 'cover',
      position: spec.kind === 'sidebar' ? sharp.strategy.attention : sharp.strategy.entropy,
    })
    .ensureAlpha(sandwichStyle.imageOpacity)
    .png()
    .toBuffer();

  let pipeline = sharp(baseLayer).composite([
    {
      input: resizedSource,
      blend: 'over',
    },
    {
      input: gradientLayer,
      blend: 'over',
    },
  ]);

  if (spec.kind === 'header') {
    pipeline = pipeline.composite([{ input: buildHeaderOverlay(spec, palette), blend: 'over' }]);
  } else if (spec.kind === 'sidebar') {
    pipeline = pipeline.composite([{ input: buildSidebarOverlay(spec, palette), blend: 'over' }]);
  } else if (spec.variant === 'desktop' || spec.variant === 'layout') {
    pipeline = pipeline.composite([{ input: buildDesktopOverlay(spec, palette), blend: 'over' }]);
  } else if (spec.variant === 'loginThumb') {
    const panelWidth = Math.round(spec.width * 0.26);
    pipeline = pipeline.composite([{
      input: buildSvgOverlay(
        spec.width,
        spec.height,
        `
          <defs>
            <linearGradient id="loginPanel" x1="1" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${withAlpha(palette.panelBg, 0.96)}" />
              <stop offset="100%" stop-color="${withAlpha(palette.panelBg, 0.24)}" />
            </linearGradient>
          </defs>
          <rect x="${spec.width - panelWidth}" y="0" width="${panelWidth}" height="${spec.height}" fill="url(#loginPanel)" />
          <rect x="${spec.width - panelWidth}" y="0" width="3" height="${spec.height}" fill="${withAlpha(palette.primary, 0.55)}" />
        `,
      ),
      blend: 'over',
    }]);
  }

  if (spec.format === 'jpeg') {
    await pipeline.jpeg({ quality: 95 }).toFile(outputPath);
    return;
  }

  await pipeline.png().toFile(outputPath);
}

async function generateBackgroundDerivatives(outputDir: string): Promise<void> {
  const bgLoginPath = path.join(outputDir, 'bg-login.jpg');
  const loginThumbPath = path.join(outputDir, 'login_thumb.jpg');
  const loginBgDir = path.join(outputDir, 'login_bg');
  const backgroundPath = path.join(outputDir, 'background.png');

  fs.mkdirSync(loginBgDir, { recursive: true });

  await sharp(bgLoginPath)
    .extract({ left: 147, top: 0, width: 1920, height: 1080 })
    .png()
    .toFile(backgroundPath);

  await sharp(bgLoginPath)
    .resize(960, 540, { fit: 'cover' })
    .jpeg({ quality: 95 })
    .toFile(loginThumbPath);

  await sharp(bgLoginPath)
    .extract({ left: 0, top: 345, width: 800, height: 390 })
    .jpeg({ quality: 95 })
    .toFile(path.join(loginBgDir, 'thumb-1.jpg'));

  await sharp(bgLoginPath)
    .extract({ left: 800, top: 345, width: 800, height: 390 })
    .jpeg({ quality: 95 })
    .toFile(path.join(loginBgDir, 'thumb-2.jpg'));
}

export function buildDerivedImageTasks(outputDir: string): DerivedImageTask[] {
  return [
    { outputFile: path.join(outputDir, 'background.png') },
    { outputFile: path.join(outputDir, 'login_thumb.jpg') },
    { outputFile: path.join(outputDir, 'login_bg', 'thumb-1.jpg') },
    { outputFile: path.join(outputDir, 'login_bg', 'thumb-2.jpg') },
    { outputFile: path.join(outputDir, 'desktop.png') },
    { outputFile: path.join(outputDir, 'layout-banner.jpg') },
  ];
}

export async function screenshotAll(outputDir: string, options: ScreenshotOptions = {}): Promise<Record<string, string>> {
  fs.mkdirSync(outputDir, { recursive: true });

  const results: Record<string, string> = {};
  const templateType = options.templateType ?? 'light-ui';
  const cssVariables = normalizeCssVariableAssignments(options.cssVariables);
  const palette = getPalette(cssVariables, options.themeColor);
  const sourceBuffer = await resolveSourceImageBuffer(options.themeImageUrl, templateType);

  for (const spec of ASSET_SPECS[templateType]) {
    const outputPath = buildOutputPath(outputDir, spec.name, spec.format);
    await renderBaseAsset(sourceBuffer, spec, palette, outputPath);
    results[spec.name] = outputPath;
    console.log(`✅ ${spec.name}: ${path.basename(outputPath)}`);
  }

  await generateBackgroundDerivatives(outputDir);
  console.log('✅ background.png (derived)');
  console.log('✅ login_thumb.jpg (derived)');
  console.log('✅ login_bg/thumb-1.jpg (derived)');
  console.log('✅ login_bg/thumb-2.jpg (derived)');

  return results;
}

if (process.argv[1]?.endsWith('screenshot.ts')) {
  const outputDir = process.argv[2] ?? './output/screenshot';
  const themeImageUrl = process.argv[3] ?? process.env.THEME_STUDIO_SCREENSHOT_BG;
  const templateType = (process.argv[4] ?? 'light-ui') as TemplateType;
  const themeColor = process.argv[5];

  screenshotAll(outputDir, { themeImageUrl, templateType, themeColor }).then((results) => {
    console.log(`\n素材生成完成: ${Object.keys(results).length} 个基础文件`);
  }).catch((err) => {
    console.error('素材生成失败:', err);
    process.exit(1);
  });
}
