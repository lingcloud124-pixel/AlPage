import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { chromium, type Browser, type Page } from 'playwright';
import sharp from 'sharp';

const PROJECT_ROOT = path.resolve(import.meta.dirname, '../..');
const WEB_ROOT = path.resolve(import.meta.dirname, '..');
const DEFAULT_SERVER_PORT = 4173;
const DEFAULT_SERVER_URL = `http://127.0.0.1:${DEFAULT_SERVER_PORT}`;

type TemplateType = 'light-ui' | 'dark-ui';
type AssetFormat = 'PNG' | 'JPEG';

export interface PreviewCaptureTask {
  id: string;
  output: string;
  width: number;
  height: number;
  format: AssetFormat;
  recipe: string;
}

export interface PreparedAssetsManifest {
  version: number;
  templateType: TemplateType;
  sourceImage: string;
  assetSources?: Record<string, string>;
  steps?: Array<{ id: string; name: string; description: string }>;
  assets: Record<string, string>;
  pendingPreviewCaptures?: PreviewCaptureTask[];
}

interface ScreenshotCliOptions {
  manifestPath: string;
  snapshotPath?: string;
  outputDir?: string;
  baseUrl?: string;
}

interface ScreenshotRuntimeOptions {
  manifestPath: string;
  snapshotPath: string;
  outputDir: string;
  baseUrl?: string;
}

interface AssetSnapshot {
  project: {
    templateType: TemplateType;
  };
  colors?: Record<string, string>;
  sourceImages?: {
    background?: string;
    headerBackground?: string;
  };
}

interface PageSpec {
  pagePath: string;
  selector: string;
  viewportWidth: number;
  viewportHeight: number;
}

interface DevServerHandle {
  baseUrl: string;
  close: () => Promise<void>;
}

function parseCliArgs(argv: string[]): ScreenshotCliOptions {
  const options: Partial<ScreenshotCliOptions> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--manifest') {
      options.manifestPath = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === '--snapshot') {
      options.snapshotPath = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === '--output') {
      options.outputDir = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === '--base-url') {
      options.baseUrl = argv[index + 1];
      index += 1;
      continue;
    }
  }

  if (!options.manifestPath) {
    throw new Error('Missing required argument: --manifest <prepared-assets-manifest.json>');
  }

  return options as ScreenshotCliOptions;
}

function normalizeCssVariables(cssVariables: Record<string, string> = {}): Record<string, string> {
  return Object.fromEntries(
    Object.entries(cssVariables)
      .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
      .map(([key, value]) => [key.startsWith('--') ? key : `--${key}`, value]),
  );
}

function toFileUrl(filePath: string): string {
  const normalized = path.resolve(filePath).split(path.sep).join('/');
  return `file://${normalized.startsWith('/') ? normalized : `/${normalized}`}`;
}

function normalizeImageSourceUrl(source?: string): string | undefined {
  if (!source) return undefined;
  if (source.startsWith('data:image/')) return source;
  if (source.startsWith('http://') || source.startsWith('https://') || source.startsWith('file://')) {
    return source;
  }
  return toFileUrl(source);
}

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
}

function resolveSnapshotPath(options: ScreenshotCliOptions, manifestPath: string): string {
  if (options.snapshotPath) {
    return path.resolve(options.snapshotPath);
  }
  return path.resolve(path.dirname(manifestPath), 'asset-snapshot.json');
}

function resolveOutputDir(options: ScreenshotCliOptions, manifestPath: string): string {
  return path.resolve(options.outputDir ?? path.dirname(manifestPath));
}

function buildPageSpec(task: PreviewCaptureTask): PageSpec {
  return {
    pagePath: '/desktop-preview.html',
    selector: '.desktop-wrapper',
    viewportWidth: 1920,
    viewportHeight: 1079,
  };
}

function resolvePreviewLayout(task: PreviewCaptureTask): string {
  switch (task.id) {
    case 'layoutBanner':
      return 'layout-banner';
    case 'fullscreenSideheader':
      return 'fullscreen-sideheader';
    case 'fullscreenSidenav':
      return 'fullscreen-sidenav';
    case 'centerSidenav':
      return 'center-sidenav';
    case 'bannerPersonal':
      return 'banner-personal';
    case 'studyBanner':
      return 'study-banner';
    case 'themeThumb':
      return 'theme-thumb';
    default:
      return 'desktop';
  }
}

async function waitForServerReady(baseUrl: string, timeoutMs = 30000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) {
        return;
      }
    } catch {
      // Retry until timeout.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for preview server: ${baseUrl}`);
}

async function startPreviewServer(baseUrl?: string): Promise<DevServerHandle> {
  if (baseUrl) {
    await waitForServerReady(baseUrl);
    return {
      baseUrl,
      close: async () => undefined,
    };
  }

  const viteBin = path.join(WEB_ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
  const child = spawn(
    process.execPath,
    [viteBin, '--host', '127.0.0.1', '--port', String(DEFAULT_SERVER_PORT), '--strictPort'],
    {
      cwd: WEB_ROOT,
      stdio: 'ignore',
    },
  );

  await waitForServerReady(DEFAULT_SERVER_URL);

  return {
    baseUrl: DEFAULT_SERVER_URL,
    close: async () => {
      child.kill('SIGTERM');
      await new Promise((resolve) => setTimeout(resolve, 300));
      if (!child.killed) {
        child.kill('SIGKILL');
      }
    },
  };
}

async function applyPreviewState(page: Page, snapshot: AssetSnapshot, manifest: PreparedAssetsManifest): Promise<void> {
  const cssVariables = normalizeCssVariables(snapshot.colors ?? {});
  const themeBackground = normalizeImageSourceUrl(snapshot.sourceImages?.background);
  const headerBackground = normalizeImageSourceUrl(snapshot.sourceImages?.headerBackground) ?? themeBackground;

  await page.addStyleTag({
    content: `
      html, body {
        background: transparent !important;
      }
    `,
  });

  await page.evaluate(
    ({ vars, themeBackgroundUrl, headerBackgroundUrl, templateType }) => {
      const root = document.documentElement;
      root.setAttribute('data-template-type', templateType);
      for (const [name, value] of Object.entries(vars)) {
        root.style.setProperty(name, value);
      }
      if (themeBackgroundUrl) {
        root.style.setProperty('--theme-bg-image', `url("${themeBackgroundUrl}")`);
        root.style.setProperty('--theme-login-bg-image', `url("${themeBackgroundUrl}")`);
      }
      if (headerBackgroundUrl) {
        root.style.setProperty('--theme-header-bg-image', `url("${headerBackgroundUrl}")`);
        root.style.setProperty('--theme-sidebar-bg-image', `url("${headerBackgroundUrl}")`);
      }
    },
    {
      vars: cssVariables,
      themeBackgroundUrl: themeBackground,
      headerBackgroundUrl: headerBackground,
      templateType: manifest.templateType,
    },
  );
}

async function captureTask(
  page: Page,
  baseUrl: string,
  task: PreviewCaptureTask,
  outputDir: string,
  snapshot: AssetSnapshot,
  manifest: PreparedAssetsManifest,
): Promise<string> {
  const spec = buildPageSpec(task);
  const targetUrl = new URL(spec.pagePath, baseUrl).toString();
  const outputPath = path.resolve(outputDir, task.output);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  await page.setViewportSize({ width: spec.viewportWidth, height: spec.viewportHeight });
  await page.goto(targetUrl, { waitUntil: 'networkidle' });
  await page.locator(spec.selector).waitFor({ state: 'visible' });
  await applyPreviewState(page, snapshot, manifest);
  const previewLayout = resolvePreviewLayout(task);
  await page.evaluate(({ layout }) => {
    document.body.setAttribute('data-preview-layout', layout);
    document.documentElement.setAttribute('data-preview-layout', layout);
  }, { layout: previewLayout });
  await page.waitForTimeout(200);

  const clip = await page.locator(spec.selector).boundingBox();
  if (!clip) {
    throw new Error(`Cannot find preview selector ${spec.selector} for task ${task.id}`);
  }

  const type = task.format === 'JPEG' ? 'jpeg' : 'png';
  const screenshot = await page.screenshot({
    type,
    quality: type === 'jpeg' ? 95 : undefined,
    clip: {
      x: clip.x,
      y: clip.y,
      width: clip.width,
      height: clip.height,
    },
  });

  let image = sharp(screenshot).resize(task.width, task.height, {
    fit: 'cover',
    position: 'centre',
  });

  if (type === 'jpeg') {
    image = image.jpeg({ quality: 95 });
  } else {
    image = image.png();
  }

  await image.toFile(outputPath);

  return outputPath;
}

export function buildPreviewCaptureTasks(manifest: PreparedAssetsManifest, outputDir: string): PreviewCaptureTask[] {
  return (manifest.pendingPreviewCaptures ?? []).map((task) => ({
    ...task,
    output: path.resolve(outputDir, task.output),
  }));
}

export async function capturePreviewAssets(options: ScreenshotRuntimeOptions): Promise<Record<string, string>> {
  const manifest = readJsonFile<PreparedAssetsManifest>(options.manifestPath);
  const snapshot = readJsonFile<AssetSnapshot>(options.snapshotPath);
  const tasks = manifest.pendingPreviewCaptures ?? [];

  if (tasks.length === 0) {
    return {};
  }

  const server = await startPreviewServer(options.baseUrl);
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: true, args: ['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars'] });
    const page = await browser.newPage();
    const outputs: Record<string, string> = {};

    for (const task of tasks) {
      const outputPath = await captureTask(page, server.baseUrl, task, options.outputDir, snapshot, manifest);
      outputs[task.id] = outputPath;
      console.log(`✅ ${task.id}: ${path.relative(options.outputDir, outputPath)}`);
    }

    return outputs;
  } finally {
    if (browser) {
      await browser.close();
    }
    await server.close();
  }
}

if (process.argv[1]?.endsWith('screenshot.ts')) {
  const cliOptions = parseCliArgs(process.argv.slice(2));
  const manifestPath = path.resolve(cliOptions.manifestPath);
  const snapshotPath = resolveSnapshotPath(cliOptions, manifestPath);
  const outputDir = resolveOutputDir(cliOptions, manifestPath);

  capturePreviewAssets({
    manifestPath,
    snapshotPath,
    outputDir,
    baseUrl: cliOptions.baseUrl,
  }).then((outputs) => {
    console.log(`\n素材截图完成: ${Object.keys(outputs).length} 个预览文件`);
  }).catch((error) => {
    console.error('素材截图失败:', error);
    process.exit(1);
  });
}
