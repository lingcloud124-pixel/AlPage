import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('env layout contract', () => {
  test('server loads dotenv from root env file path', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'server/src/index.ts'), 'utf8');

    expect(source).toContain("resolve(process.cwd(), '.env')");
  });

  test('repository keeps only root env example and removes nested examples', () => {
    expect(fs.existsSync(path.join(projectRoot, '.env.example'))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, 'server/.env.example'))).toBe(false);
    expect(fs.existsSync(path.join(projectRoot, 'web/.env.example'))).toBe(false);
  });

  test('production config exposes explicit export preview mode control', () => {
    const envExample = fs.readFileSync(path.join(projectRoot, '.env.example'), 'utf8');
    const k8sConfig = fs.readFileSync(path.join(projectRoot, 'k8s/configmap.yaml'), 'utf8');
    const productionCheck = fs.readFileSync(path.join(projectRoot, 'scripts/check-production.sh'), 'utf8');

    expect(envExample).toContain('EXPORT_PREVIEW_MODE=auto');
    expect(k8sConfig).toContain('EXPORT_PREVIEW_MODE: "service"');
    expect(productionCheck).toContain('EXPORT_PREVIEW_MODE');
    expect(productionCheck).toContain('auto|service|local');
  });
});
