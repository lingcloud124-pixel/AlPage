import * as fs from 'fs-extra';
import * as path from 'path';
import AdmZip from 'adm-zip';

const projectRoot = process.cwd();
const fixtureZipDir = path.join(projectRoot, 'tests', 'fixtures', 'zips');

async function writeSyntheticZip(targetName: string, entries: Array<{ path: string; content: string }>): Promise<void> {
  const targetPath = path.join(fixtureZipDir, targetName);
  const zip = new AdmZip();

  for (const entry of entries) {
    zip.addFile(entry.path, Buffer.from(entry.content, 'utf8'));
  }

  zip.writeZip(targetPath);
}

export async function ensureLegacyZipFixtures(): Promise<void> {
  await fs.ensureDir(fixtureZipDir);

  await writeSyntheticZip('mk-green-test.zip', [
    { path: 'meta.json', content: '{"project":"mkworks"}' },
    { path: 'index.js', content: 'const theme={themeColor:"#2C615C",sidebarBg:"#F5F7FA",linkTextColor:"#2C615C"};export default theme;' },
    { path: 'style.css', content: 'body{background:#2C615C;color:#fff;}' },
    { path: 'static/placeholder.txt', content: 'static' },
  ]);

  await writeSyntheticZip('v12-scss-test.zip', [
    { path: 'scss/lib/vars.scss', content: '$primary-color:#2C615C;$alter-color:#144E48;$alter-color-hover-on:#56817D;' },
    { path: 'scss/theme.scss', content: "@import './lib/vars.scss';\nbody{color:$primary-color;}" },
    { path: 'style/theme.css', content: 'body{background:#2C615C;}' },
    { path: 'icon/l/icon.png', content: 'stub' },
    { path: 'images/image-style/placeholder.txt', content: 'image-style' },
  ]);

  await writeSyntheticZip('login-v12-test.zip', [
    { path: 'login.jsp', content: '<html>login</html>' },
    { path: 'login_bg/bg-login.jpg', content: 'stub' },
    { path: 'login_26_festival_qingming/css/login.css', content: 'a:hover{color:#228077;}body{background:#2C615C;}' },
  ]);

  await writeSyntheticZip('v17-scss-test.zip', [
    { path: 'scss/lib/vars.scss', content: '$primary-color:#2C615C;' },
    { path: 'scss/theme.scss', content: "@import './lib/vars.scss';\nbody{color:$primary-color;}" },
    { path: 'style/main.css', content: 'body { color: #333; }' },
    { path: 'images/image-style/placeholder.txt', content: 'image-style' },
  ]);

  await writeSyntheticZip('kk-test.zip', [
    { path: 'android_theme/theme.json', content: '{"platform":"android"}' },
    { path: 'ios_theme/theme.json', content: '{"platform":"ios"}' },
  ]);
}
