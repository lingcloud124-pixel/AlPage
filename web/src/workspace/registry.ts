export interface WorkspaceCardDefinition {
  type: string;
  title: string;
}

const registry = new Map<string, WorkspaceCardDefinition>();

export function registerWorkspaceCard(definition: WorkspaceCardDefinition): void {
  registry.set(definition.type, definition);
}

export function listWorkspaceCards(): WorkspaceCardDefinition[] {
  return Array.from(registry.values());
}
