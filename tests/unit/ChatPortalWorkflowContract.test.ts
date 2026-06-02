import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('chat portal workflow contract', () => {
  test('routes conversation flow through portal collection, summary confirmation, and portal draft application', () => {
    // Portal workflow code is split across chat-manager and chat-portal-workflow
    const chatManager = fs.readFileSync(path.join(projectRoot, 'web/src/chat-manager.ts'), 'utf8');
    const portalWorkflow = fs.readFileSync(path.join(projectRoot, 'web/src/chat/chat-portal-workflow.ts'), 'utf8');
    const combined = chatManager + '\n' + portalWorkflow;

    expect(combined).toContain('createPortalGenerationPrompt');
    expect(combined).toContain('getPortalWorkflowState');
    expect(combined).toContain('applyPortalDraftToProject');
    expect(combined).toContain('renderWorkspaceEditorShell');
  });
});
