import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const stylesDir = path.join(projectRoot, 'web/src/styles');
const mainCssPath = path.join(projectRoot, 'web/src/styles.css');

let _cachedCss: string | null = null;

export function readAllCSS(): string {
  if (_cachedCss) return _cachedCss;
  const parts: string[] = [];
  const importPattern = /@import\s+['"]\.\/styles\/([^'"]+)['"]\s*;/g;
  const mainContent = fs.readFileSync(mainCssPath, 'utf8');
  let match: RegExpExecArray | null;
  while ((match = importPattern.exec(mainContent)) !== null) {
    const modulePath = path.join(stylesDir, match[1]);
    if (fs.existsSync(modulePath)) {
      parts.push(fs.readFileSync(modulePath, 'utf8'));
    }
  }
  if (parts.length === 0) {
    _cachedCss = mainContent;
  } else {
    _cachedCss = parts.join('\n');
  }
  return _cachedCss;
}
