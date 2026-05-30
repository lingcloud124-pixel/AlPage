import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('chat portal workflow contract', () => {
  test('routes conversation flow through portal collection, summary confirmation, and portal draft application', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/chat-manager.ts'), 'utf8');

    expect(source).toContain('buildPortalCollectionPrompt');
    expect(source).toContain('buildPortalSummaryPrompt');
    expect(source).toContain('createPortalGenerationPrompt');
    expect(source).toContain('getPortalWorkflowState');
    expect(source).toContain('applyPortalDraftToProject');
    expect(source).toContain('renderWorkspaceEditorShell');
  });
});
