import { describe, it, expect } from 'vitest';
import { WorkflowOrchestrator } from '../../src/theme-automation/core/WorkflowOrchestrator.js';
import { WorkflowStage, ThemePackNames } from '../../src/theme-automation/types/WorkflowTypes.js';
import { Report as ThemeUpdateReport } from '../../src/types/ManifestTypes.js';

function createThemePackNames(): ThemePackNames {
  return {
    mk: '主题-MK-2026清明主题',
    v12: '主题-V12-2026清明主题',
    v13_v13_5: '主题-V13-V13.5-2026清明主题',
    v14_v16: '主题-V14-V16-2026清明主题',
    v17: '主题-V17-2026清明主题',
    login_mk: '登录-MK-2026清明',
    login_v12: '登录-V12-2026清明',
    login_v13: '登录-V13-2026清明',
    login_v13_5: '登录-V13.5-2026清明',
    login_v14: '登录-V14-2026清明',
    login_v15: '登录-V15-2026清明',
    login_v16: '登录-V16-2026清明',
    login_v17: '登录-V17-2026清明',
    kk: 'KK-清明节-2026'
  };
}

describe('WorkflowOrchestrator', () => {
  it('regenerates design when desktop AI color feedback requests adjustment', async () => {
    const orchestrator = new WorkflowOrchestrator() as any;
    let receivedScheme: Record<string, string> | undefined;

    orchestrator.designGenerator = {
      generateDesign: async (scheme: Record<string, string>, themeName: string) => {
        receivedScheme = scheme;
        return {
          loginPageId: 'login',
          generatedNodes: [],
          themeName,
          generatedAt: new Date()
        };
      }
    };

    orchestrator.state = {
      ...orchestrator.getState(),
      stage: WorkflowStage.COLORS_GENERATED,
      request: { description: '2026年清明节，绿色科技能源风格' },
      colorScheme: {
        'primary-color': '#2C615C',
        'primary-color-hover': '#3a7f79'
      }
    };

    const result = await orchestrator.resume('主色太深，调亮一点');

    expect(receivedScheme).toBeDefined();
    expect(receivedScheme?.['primary-color']).not.toBe('#2C615C');
    expect(result.stage).toBe(WorkflowStage.DESIGN_GENERATED);
  });

  it('fails the workflow when theme updater reports failed packs', async () => {
    const orchestrator = new WorkflowOrchestrator() as any;
    orchestrator.themeUpdater = {
      processAll: async (): Promise<ThemeUpdateReport> => ({
        total: 2,
        successful: 1,
        failed: 1,
        results: [
          {
            themeName: '主题-MK-2026清明主题',
            success: true,
            updatedFiles: ['ok.css'],
            errors: [],
            duration: 12
          },
          {
            themeName: '主题-V12-2026清明主题',
            success: false,
            updatedFiles: [],
            errors: ['zip missing'],
            duration: 8
          }
        ]
      })
    };

    await expect(orchestrator.executeThemeUpdater('/tmp/manifest.json')).rejects.toThrow();
    expect(orchestrator.getState().stage).toBe(WorkflowStage.FAILED);
  });

  it('builds result paths from latest output and preserves per-pack success', () => {
    const orchestrator = new WorkflowOrchestrator() as any;
    orchestrator.state = {
      ...orchestrator.getState(),
      stage: WorkflowStage.COMPLETED,
      manifestPath: '/tmp/topic-automation/manifest.json',
      outputDir: '/tmp/topic-automation/output',
      themePackNames: createThemePackNames(),
      themeUpdateReport: {
        total: 2,
        successful: 1,
        failed: 1,
        results: [
          {
            themeName: '主题-MK-2026清明主题',
            success: false,
            updatedFiles: [],
            errors: ['zip missing'],
            duration: 5
          },
          {
            themeName: '主题-V12-2026清明主题',
            success: true,
            updatedFiles: ['vars.scss'],
            errors: [],
            duration: 7
          }
        ]
      }
    };

    const result = orchestrator.buildResult(Date.now() - 20);
    const failedPack = result.report.packDetails.find(
      (detail: { name: string }) => detail.name === '主题-MK-2026清明主题'
    );

    expect(result.themePacks[0]).toBe('/tmp/topic-automation/output/主题-MK-2026清明主题-新版.zip');
    expect(result.report.outputLocations.outputDir).toBe('/tmp/topic-automation/output');
    expect(failedPack?.success).toBe(false);
    expect(failedPack?.errors).toContain('zip missing');
  });

  it('fails asset extraction when extractor returns errors', async () => {
    const orchestrator = new WorkflowOrchestrator() as any;
    orchestrator.state = {
      ...orchestrator.getState(),
      stage: WorkflowStage.DESIGN_GENERATED,
      request: { description: '2026年清明节，绿色科技能源风格' },
      designAssets: {
        loginPageId: 'login',
        generatedNodes: [],
        themeName: 'Demo',
        generatedAt: new Date()
      }
    };
    orchestrator.assetExtractor = {
      batchExtractAssets: async () => ({
        images: [],
        colors: { primary: '#2C615C' },
        manifest: { headers: {}, generatedAt: new Date() },
        errors: ['Expected 1 exported assets, received 0']
      })
    };

    await expect(orchestrator.extractAssets()).rejects.toThrow('Asset extraction failed: Expected 1 exported assets, received 0');
  });

  it('builds sample zip paths under Dark-UI when dark mode sample exists', () => {
    const orchestrator = new WorkflowOrchestrator() as any;
    orchestrator.state = {
      ...orchestrator.getState(),
      request: { description: '深色主题', themeMode: 'dark' }
    };
    orchestrator.samplePathExists = () => true;
    const packs = orchestrator.buildThemePackList(createThemePackNames());
    expect(packs[0].zip).toContain('assets/references/samples/主题样例包/Dark-UI/');
    expect(packs[5].zip).toContain('assets/references/samples/主题样例包/Dark-UI/');
  });

  it('falls back to sample root when mode-specific sample does not exist', () => {
    const orchestrator = new WorkflowOrchestrator() as any;
    orchestrator.state = {
      ...orchestrator.getState(),
      request: { description: '浅色主题', themeMode: 'light' }
    };
    orchestrator.samplePathExists = () => false;
    const packs = orchestrator.buildThemePackList(createThemePackNames());
    expect(packs[0].zip).toContain('assets/references/samples/主题样例包/');
    expect(packs[0].zip).not.toContain('/Light-UI/');
    expect(packs[0].zip).not.toContain('/Dark-UI/');
    expect(packs[0].zip).toBe('assets/references/samples/主题样例包/主题-MK-2026清明主题.zip');
  });
});
