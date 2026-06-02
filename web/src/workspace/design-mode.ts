export interface WorkspaceDesignModeState {
  enabled: boolean;
  selectedItemId: string | null;
}

export function createWorkspaceDesignModeState(): WorkspaceDesignModeState {
  return {
    enabled: false,
    selectedItemId: null,
  };
}
