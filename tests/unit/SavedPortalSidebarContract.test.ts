import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('saved portal sidebar contract', () => {
  test('topbar save uses toast feedback and refreshes saved projects', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/ui-setup.ts'), 'utf8');

    expect(source).toContain('showNotificationWithOptions');
    expect(source).toContain('保存成功');
    expect(source).toContain('refreshSidebar');
    expect(source).toContain('conversationId');
    expect(source).toContain('saveChatHistory()');
    expect(source).toContain('conversationSnapshot');
    expect(source).toContain('getConversationHistory()');
    expect(source).toContain('SavedPortalNotFoundError');
    expect(source).toContain('instanceof SavedPortalNotFoundError');
  });

  test('sidebar labels saved projects instead of starred projects', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'web/index.html'), 'utf8');

    expect(html).toContain('保存项目');
    expect(html).toContain('sidebarSavedProjectsSection');
    expect(html).toContain('sidebarSavedProjectMoreBtn');
    expect(html).not.toContain('收藏项目');
    expect(html.indexOf('resultFullscreenBtn')).toBeLessThan(html.indexOf('resultSavePortalBtn'));
    expect(html).toContain('topbar-action-btn topbar-action-btn--primary');
  });

  test('saved projects render newest first, default to five, and expand through more', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/components/sidebar.ts'), 'utf8');

    expect(source).toContain('listSavedPortals');
    expect(source).toContain('getSavedPortal');
    expect(source).toContain('deleteSavedPortal');
    expect(source).toContain('conversationId');
    expect(source).toContain('getConversation(detail.conversationId)');
    expect(source).toContain('SAVED_PROJECT_VISIBLE_LIMIT = 5');
    expect(source).toContain('updatedAt - a.updatedAt');
    expect(source).toContain('savedProjectsExpanded');
    expect(source).toContain('slice(0, SAVED_PROJECT_VISIBLE_LIMIT)');
    expect(source).toContain('sidebarSavedProjectMoreBtn');
    expect(source).toContain('sidebar:restore-project');
    expect(source).toContain('showSavedProjectMenu');
    expect(source).toContain('snapshot.savedPortalId = id');
    expect(source).toContain('conversation.projectSnapshot.savedPortalId = id');
    expect(source).toContain('确定要删除这个保存项目吗？');
    expect(source).toContain('确定要删除这条对话记录吗？');
  });

  test('saved project conversations are hidden from history list', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/components/sidebar.ts'), 'utf8');

    expect(source).toContain('savedConversationIds');
    expect(source).toContain('savedProjects.map');
    expect(source).toContain('item => !savedConversationIds.has(item.id)');
  });

  test('server persists conversation id with saved portals', () => {
    const dbSource = fs.readFileSync(path.join(projectRoot, 'server/src/db.ts'), 'utf8');
    const routeSource = fs.readFileSync(path.join(projectRoot, 'server/src/routes/saved-portals.ts'), 'utf8');
    const apiSource = fs.readFileSync(path.join(projectRoot, 'web/src/api/saved-portals.ts'), 'utf8');

    expect(dbSource).toContain('ALTER TABLE saved_portals ADD COLUMN conversation_id');
    expect(dbSource).toContain('ALTER TABLE saved_portals ADD COLUMN conversation_snapshot');
    expect(routeSource).toContain('conversationId');
    expect(routeSource).toContain('conversation_id');
    expect(routeSource).toContain('conversationSnapshot');
    expect(routeSource).toContain('conversation_snapshot');
    expect(apiSource).toContain('conversationId');
    expect(apiSource).toContain('conversationSnapshot');
    expect(apiSource).toContain('SavedPortalNotFoundError');
    expect(apiSource).toContain('throw new SavedPortalNotFoundError');
  });

  test('server maps saved portal rows to frontend camelCase shape', () => {
    const routeSource = fs.readFileSync(path.join(projectRoot, 'server/src/routes/saved-portals.ts'), 'utf8');

    expect(routeSource).toContain('function mapSavedPortalRow');
    expect(routeSource).toContain('projectId:');
    expect(routeSource).toContain('conversationId:');
    expect(routeSource).toContain('conversationSnapshot:');
    expect(routeSource).toContain('templateType:');
    expect(routeSource).toContain('createdAt:');
    expect(routeSource).toContain('updatedAt:');
    expect(routeSource).toContain('items: rows.map(mapSavedPortalRow)');
    expect(routeSource).not.toContain('res.json(row)');
  });

  test('conversation save failures stop portal save instead of binding stale conversation id', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/chat/chat-conversation-state.ts'), 'utf8');
    const apiSource = fs.readFileSync(path.join(projectRoot, 'web/src/api/conversations.ts'), 'utf8');
    const catchIndex = source.indexOf("console.error('[conversation] Save error:', err)");
    const catchBlock = source.slice(catchIndex, catchIndex + 180);

    expect(catchIndex).toBeGreaterThan(-1);
    expect(source).toContain('throw err');
    expect(catchBlock).toContain('throw err');
    expect(catchBlock).not.toContain('return _activeConversationId;');
    expect(apiSource).toContain('throw new Error(`createConversation failed: ${res.status}`)');
    expect(apiSource).toContain('throw new Error(`updateConversation failed: ${res.status}`)');
    expect(source).toContain('if (!result) throw new Error');
    expect(source).toContain('const updated = await updateConversation');
    expect(source).toContain('if (!updated) throw new Error');
  });
});
