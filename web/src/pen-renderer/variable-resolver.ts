import { PenVariable } from './types';

export class VariableResolver {
  private variables: Record<string, PenVariable>;
  private resolvedCache: Map<string, string> = new Map();

  constructor(variables: Record<string, PenVariable>) {
    this.variables = variables;
    this.clearCache();
  }

  private clearCache(): void {
    this.resolvedCache.clear();
  }

  private resolveVariable(name: string, visited: Set<string> = new Set()): string {
    if (visited.has(name)) {
      return `$${name}`;
    }

    if (this.resolvedCache.has(name)) {
      return this.resolvedCache.get(name)!;
    }

    const variable = this.variables[name];
    if (!variable) {
      return `$${name}`;
    }

    visited.add(name);
    let resolvedValue: string;

    if (typeof variable.value === 'string' && variable.value.startsWith('$')) {
      const refName = variable.value.substring(1);
      resolvedValue = this.resolveVariable(refName, visited);
    } else {
      resolvedValue = variable.value;
    }

    visited.delete(name);
    this.resolvedCache.set(name, resolvedValue);
    return resolvedValue;
  }

  resolve(value: string): string {
    if (typeof value === 'string' && value.startsWith('$')) {
      const varName = value.substring(1);
      const resolved = this.resolveVariable(varName);
      if (resolved.startsWith('$')) {
        return `var(--${resolved.substring(1)})`;
      }
      return `var(--${varName})`;
    }
    return value;
  }

  getAllResolved(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const name in this.variables) {
      if (Object.prototype.hasOwnProperty.call(this.variables, name)) {
        result[name] = this.resolveVariable(name);
      }
    }
    return result;
  }

  injectToRoot(): void {
    const root = document.documentElement;
    const resolved = this.getAllResolved();
    
    for (const [name, value] of Object.entries(resolved)) {
      if (!value.startsWith('$')) {
        root.style.setProperty(`--${name}`, value);
      }
    }
  }

  updateVariable(name: string, value: string): void {
    if (!this.variables[name]) {
      this.variables[name] = { type: 'string', value };
    } else {
      this.variables[name].value = value;
    }
    
    this.clearCache();
    
    const resolvedValue = this.resolveVariable(name);
    if (!resolvedValue.startsWith('$')) {
      document.documentElement.style.setProperty(`--${name}`, resolvedValue);
    }
  }
}