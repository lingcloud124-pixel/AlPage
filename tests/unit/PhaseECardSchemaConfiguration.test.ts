import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('Phase E: workspace card schema-driven configuration', () => {
  // --- card-renderer.ts ---
  describe('card renderer has config button', () => {
    const source = fs.readFileSync(
      path.join(projectRoot, 'web/src/workspace/card-renderer.ts'),
      'utf8',
    );

    test('has config-card action button', () => {
      expect(source).toContain('data-action="config-card"');
    });

    test('config button has gear icon', () => {
      expect(source).toContain('⚙');
    });

    test('config button is in header actions', () => {
      const configIdx = source.indexOf('data-action="config-card"');
      const actionsIdx = source.indexOf('workspace-editor-card-header-actions');
      expect(configIdx).toBeGreaterThan(actionsIdx);
    });
  });

  // --- card-content-configuration.ts ---
  describe('card content configuration is schema-driven', () => {
    const source = fs.readFileSync(
      path.join(projectRoot, 'web/src/components/card-content-configuration.ts'),
      'utf8',
    );

    test('imports getWorkspaceTemplateCache', () => {
      expect(source).toContain('getWorkspaceTemplateCache');
    });

    test('has renderSchemaField function', () => {
      expect(source).toContain('function renderSchemaField');
    });

    test('generates text input for text type', () => {
      const fnBlock = source.substring(
        source.indexOf('function renderSchemaField'),
        source.indexOf('function renderSchemaField') + 3000,
      );
      expect(fnBlock).toContain("case 'text'");
      expect(fnBlock).toContain('type="text"');
    });

    test('generates number input for number type', () => {
      expect(source).toContain("case 'number'");
      expect(source).toContain('type="number"');
    });

    test('generates select for select type', () => {
      expect(source).toContain("case 'select'");
    });

    test('generates checkbox for boolean type', () => {
      expect(source).toContain("case 'boolean'");
      expect(source).toContain('type="checkbox"');
    });

    test('generates url input for link type', () => {
      expect(source).toContain("case 'link'");
      expect(source).toContain('type="url"');
    });

    test('generates list editor for list type', () => {
      expect(source).toContain("case 'list'");
      expect(source).toContain('card-list-item-row');
      expect(source).toContain('card-list-item-add');
    });

    test('generates image url input for image type', () => {
      expect(source).toContain("case 'image'");
    });

    test('exports collectCardFieldValues', () => {
      expect(source).toContain('export function collectCardFieldValues');
    });

    test('collectCardFieldValues only returns schema-defined fields', () => {
      expect(source).toContain('__cardFields');
    });

    test('collectCardFieldValues handles boolean type', () => {
      expect(source).toContain('.checked');
    });

    test('collectCardFieldValues handles number type', () => {
      expect(source).toContain('parseFloat');
    });

    test('collectCardFieldValues handles list type', () => {
      const fnStart = source.indexOf('export function collectCardFieldValues');
      const fnBlock = source.substring(fnStart, fnStart + 2000);
      expect(fnBlock).toContain('list');
      expect(fnBlock).toContain('card-list-item-row');
    });
  });

  // --- runtime.ts wiring ---
  describe('runtime.ts wires config button and schema form', () => {
    const source = fs.readFileSync(
      path.join(projectRoot, 'web/src/workspace/runtime.ts'),
      'utf8',
    );

    test('imports collectCardFieldValues', () => {
      expect(source).toContain('collectCardFieldValues');
    });

    test('handles config-card action', () => {
      expect(source).toContain('data-action="config-card"');
      expect(source).toContain("setActiveConfigTab('card')");
    });

    test('opens properties drawer on config click', () => {
      const configIdx = source.indexOf('data-action="config-card"');
      const drawerIdx = source.indexOf("openWorkspacePropertiesDrawer('card')", configIdx - 200);
      expect(drawerIdx).toBeGreaterThan(configIdx - 200);
    });

    test('bindCardContentFormEvents uses collectCardFieldValues', () => {
      const fnStart = source.indexOf('function bindCardContentFormEvents');
      const fnBlock = source.substring(fnStart, fnStart + 1000);
      expect(fnBlock).toContain('collectCardFieldValues');
    });
  });
});
