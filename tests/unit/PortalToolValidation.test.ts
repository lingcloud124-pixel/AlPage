import { describe, expect, test } from 'vitest';

describe('update_portal_profile tool validation', () => {
  test('accepts update_portal_profile with valid args', async () => {
    const { executeTool } = await import('../../web/src/tools/executor');
    const result = await executeTool(
      { tool: 'update_portal_profile', args: { customerName: '国网电力', customerIndustry: '能源' } },
      () => {},
    );
    expect(result.success).toBe(true);
  });

  test('update_portal_profile returns merged profile in result data', async () => {
    const { executeTool } = await import('../../web/src/tools/executor');
    const result = await executeTool(
      {
        tool: 'update_portal_profile',
        args: {
          customerName: '国网电力',
          customerIndustry: '能源',
          customerFunctions: ['电力调度', '安全管理'],
        },
      },
      () => {},
    );
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('profile');
    expect(result.data.profile.customerName).toBe('国网电力');
    expect(result.data.profile.customerIndustry).toBe('能源');
  });
});
