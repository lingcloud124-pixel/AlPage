import type { DesktopAIColorScheme } from '../types/DesktopAI.js';

declare global {
  function pencil_open_document(args: { filePathOrTemplate: string }): Promise<void>;
  function pencil_get_editor_state(args: { include_schema: boolean }): Promise<{
    '/Users/gulingfei/Desktop/AI/Light-UI-模板.pen'?: { file_path: string };
    nodeCount: number;
  }>;
  function pencil_set_variables(args: {
    filePath: string;
    variables: Record<string, { type: string; value: string }>;
  }): Promise<void>;
  function pencil_batch_design(args: {
    filePath: string;
    operations: string;
  }): Promise<Record<string, string>>;
  function pencil_batch_get(args: {
    filePath: string;
    nodeIds: string[];
    readDepth?: number;
    searchDepth?: number;
  }): Promise<Record<string, unknown>>;
  function pencil_export_nodes(args: {
    filePath: string;
    format: 'png' | 'jpeg' | 'webp' | 'pdf';
    nodeIds: string[];
    outputDir: string;
    scale?: number;
  }): Promise<string[]>;
  function pencil_get_screenshot(args: {
    filePath: string;
    nodeId: string;
  }): Promise<string>;
  function pencil_snapshot_layout(args: {
    filePath: string;
    maxDepth?: number;
    parentId?: string;
    problemsOnly?: boolean;
  }): Promise<Record<string, unknown>>;
  function pencil_find_empty_space_on_canvas(args: {
    filePath: string;
    direction: 'top' | 'right' | 'bottom' | 'left';
    width: number;
    height: number;
    padding: number;
    nodeId?: string;
  }): Promise<{ x: number; y: number }>;
  function pencil_get_variables(args: { filePath: string }): Promise<Record<string, unknown>>;
}

export interface BatchResult {
  success: boolean;
  results?: Record<string, string>;
  error?: string;
}

export interface EditorState {
  filePath: string;
  hasNodes: boolean;
  nodeCount: number;
}

export class PencilMCPClient {
  private currentFilePath: string | null = null;

  async openDocument(filePath: string): Promise<void> {
    await pencil_open_document({ filePathOrTemplate: filePath });
    this.currentFilePath = filePath;
  }

  async getEditorState(): Promise<EditorState> {
    const result = await pencil_get_editor_state({ include_schema: false });
    const fileData = result['/Users/gulingfei/Desktop/AI/Light-UI-模板.pen'];

    return {
      filePath: fileData?.file_path || '',
      hasNodes: result.nodeCount > 0,
      nodeCount: result.nodeCount || 0,
    };
  }

  async setVariables(
    filePath: string,
    variables: Record<string, { type: string; value: string }>
  ): Promise<void> {
    await pencil_set_variables({ filePath, variables });
  }

  async batchDesign(
    filePath: string,
    operations: string[]
  ): Promise<BatchResult> {
    try {
      const result = await pencil_batch_design({
        filePath,
        operations: operations.join('\n'),
      });
      return { success: true, results: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async batchGet(
    filePath: string,
    nodeIds: string[],
    options?: { readDepth?: number; searchDepth?: number }
  ): Promise<Record<string, unknown>> {
    return pencil_batch_get({ filePath, nodeIds, ...options });
  }

  async exportNodes(
    filePath: string,
    nodeIds: string[],
    outputDir: string,
    format: 'png' | 'jpeg' | 'webp' | 'pdf' = 'png',
    scale: number = 1
  ): Promise<string[]> {
    return pencil_export_nodes({ filePath, format, nodeIds, outputDir, scale });
  }

  async getScreenshot(filePath: string, nodeId: string): Promise<string> {
    return pencil_get_screenshot({ filePath, nodeId });
  }

  async snapshotLayout(
    filePath: string,
    maxDepth?: number,
    parentId?: string,
    problemsOnly?: boolean
  ): Promise<Record<string, unknown>> {
    return pencil_snapshot_layout({ filePath, maxDepth, parentId, problemsOnly });
  }

  async findEmptySpace(
    filePath: string,
    direction: 'top' | 'right' | 'bottom' | 'left',
    width: number,
    height: number,
    padding: number,
    nodeId?: string
  ): Promise<{ x: number; y: number }> {
    return pencil_find_empty_space_on_canvas({ filePath, direction, width, height, padding, nodeId });
  }

  async getVariables(filePath: string): Promise<Record<string, unknown>> {
    return pencil_get_variables({ filePath });
  }

  async applyColorScheme(colorScheme: DesktopAIColorScheme): Promise<void> {
    if (!this.currentFilePath) {
      throw new Error('No document opened. Call openDocument first.');
    }

    const variables: Record<string, { type: string; value: string }> = {};
    for (const [name, value] of Object.entries(colorScheme)) {
      variables[`$${name}`] = { type: 'color', value };
    }

    await this.setVariables(this.currentFilePath, variables);
  }

  getCurrentFilePath(): string | null {
    return this.currentFilePath;
  }
}

let clientInstance: PencilMCPClient | null = null;

export function getPencilClient(): PencilMCPClient {
  if (!clientInstance) {
    clientInstance = new PencilMCPClient();
  }
  return clientInstance;
}

export function resetPencilClient(): void {
  clientInstance = null;
}
