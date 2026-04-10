import { readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import {
  DesktopAIColorScheme,
  EKPVersion,
  ProductType,
  VariableMappingConfig,
  PencilVariable,
  VersionedEKPVar,
} from '../types/DesktopAI.js';

export class VariableMapper {
  private mapping: VariableMappingConfig;
  private configDir: string;

  constructor(configDir?: string) {
    const moduleDir = dirname(fileURLToPath(import.meta.url));
    this.configDir = configDir || resolve(moduleDir, '..', '..', 'config');
    this.mapping = this.loadMappingConfig();
  }

  private loadMappingConfig(): VariableMappingConfig {
    const configPath = join(this.configDir, 'variable-mapping.json');
    const content = readFileSync(configPath, 'utf-8');
    return JSON.parse(content);
  }

  getMapping(): VariableMappingConfig {
    return this.mapping;
  }

  getPencilVariables(): Record<string, PencilVariable> {
    return this.mapping.pencilVariables;
  }

  getEKPVersions(): EKPVersion[] {
    return Object.keys(this.mapping.ekpVersions) as EKPVersion[];
  }

  getVersionConfig(version: EKPVersion) {
    return this.mapping.ekpVersions[version];
  }

  isBaseVersion(version: EKPVersion): boolean {
    return this.mapping.ekpVersions[version]?.baseVersion === true;
  }

  isVersionConsistent(varName: keyof DesktopAIColorScheme): boolean {
    return this.mapping.pencilVariables[varName]?.versionConsistent ?? true;
  }

  getProductVar(
    varName: keyof DesktopAIColorScheme,
    product: ProductType
  ): string | null {
    const varConfig = this.mapping.pencilVariables[varName];
    if (!varConfig) return null;

    const productVar = varConfig.products[product];
    if (!productVar) return null;

    if (typeof productVar === 'string') {
      return productVar;
    }

    return null;
  }

  getEKPVar(
    varName: keyof DesktopAIColorScheme,
    version: EKPVersion
  ): string | null {
    const varConfig = this.mapping.pencilVariables[varName];
    if (!varConfig) return null;

    const { ekp } = varConfig.products;

    if (typeof ekp === 'string') {
      return ekp;
    }

    if (typeof ekp === 'object' && ekp !== null) {
      return this.getVersionedEKPVar(ekp, version);
    }

    return null;
  }

  private getVersionedEKPVar(
    versionedVar: VersionedEKPVar,
    version: EKPVersion
  ): string | null {
    if (version === 'v17') {
      return versionedVar.v17;
    }

    if (version === 'v14-v16') {
      return versionedVar['v14-v16'];
    }

    if (version === 'v13') {
      return versionedVar.v13 ?? null;
    }

    if (version === 'v12') {
      return versionedVar.v12 ?? null;
    }

    return null;
  }

  resolveVarRef(ref: string, vars: DesktopAIColorScheme): string {
    if (!ref.startsWith('$')) {
      return ref;
    }

    const varName = ref.slice(1) as keyof DesktopAIColorScheme;
    return vars[varName] || ref;
  }

  generateEKPVariables(
    colorScheme: DesktopAIColorScheme,
    version: EKPVersion
  ): Record<string, string> {
    const result: Record<string, string> = {};

    for (const [varName, varConfig] of Object.entries(this.mapping.pencilVariables)) {
      const ekpVar = this.getEKPVar(varName as keyof DesktopAIColorScheme, version);

      if (!ekpVar) continue;

      let value = varConfig.value;
      if (value.startsWith('$')) {
        value = this.resolveVarRef(value, colorScheme);
      }

      if (ekpVar.startsWith('$')) {
        result[ekpVar] = value;
      } else {
        result[ekpVar] = value;
      }
    }

    return result;
  }

  generateSCSSContent(
    colorScheme: DesktopAIColorScheme,
    version: EKPVersion
  ): string {
    const vars = this.generateEKPVariables(colorScheme, version);
    const lines: string[] = [];

    for (const [name, value] of Object.entries(vars)) {
      lines.push(`${name}: ${value};`);
    }

    return lines.join('\n');
  }

  generateMKVariables(
    colorScheme: DesktopAIColorScheme
  ): Record<string, string> {
    const result: Record<string, string> = {};

    for (const [varName, varConfig] of Object.entries(this.mapping.pencilVariables)) {
      const mkVar = this.getProductVar(varName as keyof DesktopAIColorScheme, 'mk');

      if (!mkVar || mkVar === 'N/A') continue;

      let value = varConfig.value;
      if (value.startsWith('$')) {
        value = this.resolveVarRef(value, colorScheme);
      }

      if (mkVar.startsWith('--')) {
        result[mkVar] = value;
      } else if (mkVar.startsWith('.')) {
        result[mkVar] = value;
      } else if (mkVar.startsWith('color:') || mkVar.startsWith('background:')) {
        const cssProperty = mkVar.split(':')[0];
        result[cssProperty.trim()] = value;
      } else {
        result[mkVar] = value;
      }
    }

    return result;
  }

  generateKKVariables(
    colorScheme: DesktopAIColorScheme
  ): Record<string, string> {
    const result: Record<string, string> = {};

    for (const [varName, varConfig] of Object.entries(this.mapping.pencilVariables)) {
      const kkVar = this.getProductVar(varName as keyof DesktopAIColorScheme, 'kk');

      if (!kkVar || kkVar === 'N/A') continue;

      let value = varConfig.value;
      if (value.startsWith('$')) {
        value = this.resolveVarRef(value, colorScheme);
      }

      result[kkVar] = value;
    }

    return result;
  }

  getSupportedHeaderTypes(version: EKPVersion): string[] {
    const config = this.mapping.ekpVersions[version];
    return config?.supportedHeaderTypes || [];
  }

  getVariableCategories(): string[] {
    const categories = new Set<string>();

    for (const varConfig of Object.values(this.mapping.pencilVariables)) {
      if (varConfig.category) {
        categories.add(varConfig.category);
      }
    }

    return Array.from(categories);
  }

  getVariablesByCategory(
    category: string
  ): Array<{ name: keyof DesktopAIColorScheme; config: PencilVariable }> {
    const result: Array<{
      name: keyof DesktopAIColorScheme;
      config: PencilVariable;
    }> = [];

    for (const [name, config] of Object.entries(this.mapping.pencilVariables)) {
      if (config.category === category) {
        result.push({
          name: name as keyof DesktopAIColorScheme,
          config,
        });
      }
    }

    return result;
  }
}

let instance: VariableMapper | null = null;

export function getVariableMapper(configDir?: string): VariableMapper {
  if (!instance) {
    instance = new VariableMapper(configDir);
  }
  return instance;
}

export function resetVariableMapper(): void {
  instance = null;
}
