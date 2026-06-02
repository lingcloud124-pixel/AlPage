import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

const dbSource = fs.readFileSync(path.join(projectRoot, 'server/src/db.ts'), 'utf8');
const industryCasesRoute = fs.readFileSync(path.join(projectRoot, 'server/src/routes/industry-cases.ts'), 'utf8');
const savedPortalsRoute = fs.readFileSync(path.join(projectRoot, 'server/src/routes/saved-portals.ts'), 'utf8');
const indexSource = fs.readFileSync(path.join(projectRoot, 'server/src/index.ts'), 'utf8');
const adminHtml = fs.readFileSync(path.join(projectRoot, 'server/admin/index.html'), 'utf8');
const industryCasesApi = fs.readFileSync(path.join(projectRoot, 'web/src/api/industry-cases.ts'), 'utf8');
const htmlSource = fs.readFileSync(path.join(projectRoot, 'web/index.html'), 'utf8');
const uiSetupSource = fs.readFileSync(path.join(projectRoot, 'web/src/ui-setup.ts'), 'utf8');

describe('Case curate from saved portal', () => {
  // 1. 前台不再显示"录入资料库"按钮
  test('frontend does not have resultSaveCaseBtn', () => {
    expect(htmlSource).not.toContain('resultSaveCaseBtn');
    expect(htmlSource).not.toContain('录入资料库');
  });

  test('frontend does not have resultPublishBtn', () => {
    expect(htmlSource).not.toContain('resultPublishBtn');
  });

  test('frontend share button is main action', () => {
    expect(htmlSource).toContain('id="resultShareBtn"');
    expect(htmlSource).toContain('topbar-action-btn--accent');
    expect(htmlSource).toContain('分享');
  });

  test('frontend has copy edit link button', () => {
    expect(htmlSource).toContain('resultCopyEditLinkBtn');
    expect(htmlSource).toContain('复制编辑链接');
  });

  // 2. DB schema has new columns
  test('industry_cases has source_portal_id column', () => {
    expect(dbSource).toContain('source_portal_id');
  });

  test('industry_cases has source_snapshot column', () => {
    expect(dbSource).toContain('source_snapshot');
  });

  test('industry_cases has case_title column', () => {
    expect(dbSource).toContain('case_title');
  });

  test('industry_cases has source_project_id column', () => {
    expect(dbSource).toContain('source_project_id');
  });

  test('industry_cases has source_saved_at column', () => {
    expect(dbSource).toContain('source_saved_at');
  });

  test('saved_portals has curated_case_count column', () => {
    expect(dbSource).toContain('curated_case_count');
  });

  test('saved_portals has conversation_snapshot column', () => {
    expect(dbSource).toContain('conversation_snapshot');
  });

  // 3. industry-cases route has from-saved-portal endpoint
  test('POST from-saved-portal route exists', () => {
    expect(industryCasesRoute).toContain('/from-saved-portal/:portalId');
  });

  test('from-saved-portal writes source_snapshot', () => {
    expect(industryCasesRoute).toContain('source_snapshot');
    expect(industryCasesRoute).toContain('JSON.parse(JSON.stringify(');
  });

  test('from-saved-portal increments curated_case_count on saved portal', () => {
    expect(industryCasesRoute).toContain('curated_case_count');
  });

  // 4. PUT route for updating cases (admin version)
  test('PUT route exists for updating case metadata', () => {
    expect(industryCasesRoute).toContain("industryCasesAdminRouter.put('/:id'");
  });

  test('PUT route updates referenceEnabled', () => {
    expect(industryCasesRoute).toContain('reference_enabled');
    expect(industryCasesRoute).toContain('referenceEnabled');
  });

  test('PUT route updates displayEnabled', () => {
    expect(industryCasesRoute).toContain('display_enabled');
    expect(industryCasesRoute).toContain('displayEnabled');
  });

  // 5. No cascade delete logic
  test('deleting saved portal does not cascade to industry cases', () => {
    const deleteSection = savedPortalsRoute.match(/DELETE[^}]+}/s);
    expect(deleteSection).toBeDefined();
    // The delete route only touches saved_portals table
    expect(deleteSection![0]).not.toContain('industry_cases');
  });

  // 6. Admin route mounted
  test('admin saved-portals route is mounted', () => {
    expect(indexSource).toContain('/api/admin/saved-portals');
    expect(indexSource).toContain('savedPortalsAdminRouter');
  });

  test('admin route uses adminAuthMiddleware', () => {
    expect(indexSource).toContain("adminAuthMiddleware, savedPortalsAdminRouter");
  });

  // 7. saved-portals has admin router
  test('savedPortalsAdminRouter is exported', () => {
    expect(savedPortalsRoute).toContain('savedPortalsAdminRouter');
  });

  test('admin router has /all endpoint', () => {
    expect(savedPortalsRoute).toContain("get('/all'");
  });

  // 8. Frontend API only has read functions (curate/update is admin-only)
  test('frontend API does NOT have curateFromSavedPortal', () => {
    expect(industryCasesApi).not.toContain('curateFromSavedPortal');
    expect(industryCasesApi).not.toContain('updateIndustryCase');
    expect(industryCasesApi).not.toContain('createIndustryCase');
    expect(industryCasesApi).not.toContain('deleteIndustryCase');
  });

  test('frontend API still has listIndustryCases and getIndustryCase', () => {
    expect(industryCasesApi).toContain('listIndustryCases');
    expect(industryCasesApi).toContain('getIndustryCase');
  });

  test('IndustryCaseSummary includes sourcePortalId and caseTitle', () => {
    expect(industryCasesApi).toContain('sourcePortalId');
    expect(industryCasesApi).toContain('caseTitle');
  });

  // 9. Admin panel has dual-tab resource library
  test('admin panel has 资料库管理 tab', () => {
    expect(adminHtml).toContain('资料库管理');
  });

  test('admin panel has saved-portals subtab', () => {
    expect(adminHtml).toContain('已保存方案');
    expect(adminHtml).toContain('subtab-saved-portals');
  });

  test('admin panel has curated-cases subtab', () => {
    expect(adminHtml).toContain('沉淀案例');
    expect(adminHtml).toContain('subtab-curated-cases');
  });

  test('admin panel has curate modal', () => {
    expect(adminHtml).toContain('curateModal');
    expect(adminHtml).toContain('submitCurateCase');
  });

  test('admin panel has edit case modal', () => {
    expect(adminHtml).toContain('editCaseModal');
    expect(adminHtml).toContain('saveCaseDetails');
  });

  // 10. Frontend share does save + publish + copy
  test('share handler saves and publishes', () => {
    expect(uiSetupSource).toContain('publishSavedPortal');
    expect(uiSetupSource).toContain('已复制预览链接');
  });

  test('share handler uses /p/ URL format', () => {
    expect(uiSetupSource).toContain('/p/');
  });

  test('ui-setup does not import createIndustryCase', () => {
    expect(uiSetupSource).not.toContain('createIndustryCase');
  });

  test('ui-setup does not import anonymizeRequirementSummary', () => {
    expect(uiSetupSource).not.toContain('anonymizeRequirementSummary');
  });

  // 11. User isolation: normal user routes filter by user_id
  test('GET / filters by user_id', () => {
    expect(industryCasesRoute).toContain('WHERE user_id = ?');
  });

  test('GET /:id checks user_id ownership', () => {
    const getDetailMatch = industryCasesRoute.match(/industryCasesRouter\.get\('\/:id'[^}]+}/s);
    expect(getDetailMatch).toBeDefined();
    expect(getDetailMatch![0]).toContain('user_id = ?');
  });

  // 12. Admin industry-cases route is mounted
  test('admin industry-cases route is mounted', () => {
    expect(indexSource).toContain('/api/admin/industry-cases');
    expect(indexSource).toContain('industryCasesAdminRouter');
  });

  test('admin industry-cases uses adminAuthMiddleware', () => {
    expect(indexSource).toContain('adminAuthMiddleware, industryCasesAdminRouter');
  });

  // 13. Admin router exported
  test('industryCasesAdminRouter is exported', () => {
    expect(industryCasesRoute).toContain('export const industryCasesAdminRouter');
  });

  // 14. Admin panel calls admin endpoints, not user endpoints
  test('admin panel calls /api/admin/industry-cases', () => {
    expect(adminHtml).toContain('/api/admin/industry-cases');
    expect(adminHtml).not.toContain("fetch('/api/industry-cases");
  });

  // 15. conversation_snapshot is written on save
  test('buildSavedPortalPayload includes conversationSnapshot', () => {
    expect(uiSetupSource).toContain('conversationSnapshot');
    expect(uiSetupSource).toContain('getConversationHistory');
  });

  test('saved-portals create route accepts conversationSnapshot', () => {
    expect(savedPortalsRoute).toContain('conversationSnapshot');
    expect(savedPortalsRoute).toContain('conversation_snapshot');
  });

  // 16. Normal user from-saved-portal is removed (only admin has it)
  test('normal user router does NOT have from-saved-portal', () => {
    // The user-scoped router no longer has from-saved-portal
    const userRouterSection = industryCasesRoute.split('industryCasesAdminRouter')[0];
    expect(userRouterSection).not.toContain('/from-saved-portal');
  });

  test('admin router has from-saved-portal', () => {
    expect(industryCasesRoute).toContain("industryCasesAdminRouter.post('/from-saved-portal/:portalId'");
  });
});
