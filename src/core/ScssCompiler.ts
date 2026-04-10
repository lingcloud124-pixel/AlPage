import * as sass from 'sass';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, relative, dirname } from 'path';

export type ScssOutputStyle = 'expanded' | 'compressed';

export interface ScssCompileOptions {
  inputDir: string;
  outputDir: string;
  style?: ScssOutputStyle;
  sourceMap?: boolean;
}

export interface ScssCompileResult {
  success: boolean;
  compiledFiles: string[];
  errors: string[];
}

export class ScssCompiler {
  async compileFile(
    scssPath: string,
    cssPath: string,
    style: ScssOutputStyle = 'expanded',
    sourceMap: boolean = false
  ): Promise<boolean> {
    try {
      if (!existsSync(scssPath)) {
        return false;
      }

      const result = sass.compile(scssPath, {
        style: style,
        sourceMap: sourceMap,
        loadPaths: [dirname(scssPath)],
        quietDeps: true,
        verbose: false,
      });

      await mkdir(dirname(cssPath), { recursive: true });
      await writeFile(cssPath, result.css);

      return true;
    } catch {
      return false;
    }
  }

  async compile(options: ScssCompileOptions): Promise<ScssCompileResult> {
    const { inputDir, outputDir, style = 'expanded', sourceMap = false } = options;
    const compiledFiles: string[] = [];
    const errors: string[] = [];
    const compilePromises: Promise<void>[] = [];

    try {
      await this.compileDirectoryParallel(
        inputDir, 
        inputDir, 
        outputDir, 
        style, 
        sourceMap, 
        compiledFiles, 
        errors,
        compilePromises
      );
      
      await Promise.all(compilePromises);

      return {
        success: errors.length === 0,
        compiledFiles,
        errors,
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      return {
        success: false,
        compiledFiles,
        errors,
      };
    }
  }

  private async compileDirectoryParallel(
    currentDir: string,
    rootInputDir: string,
    rootOutputDir: string,
    style: ScssOutputStyle,
    sourceMap: boolean,
    compiledFiles: string[],
    errors: string[],
    compilePromises: Promise<void>[]
  ): Promise<void> {
    const { readdir } = await import('fs/promises');
    const entries = await readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await this.compileDirectoryParallel(
          fullPath, rootInputDir, rootOutputDir, style, sourceMap, compiledFiles, errors, compilePromises
        );
      } else if (entry.isFile() && entry.name.endsWith('.scss') && !entry.name.startsWith('_')) {
        const relativePath = relative(rootInputDir, fullPath);
        const cssPath = join(rootOutputDir, relativePath.replace('.scss', '.css'));

        const promise = this.compileFile(fullPath, cssPath, style, sourceMap).then(success => {
          if (success) {
            compiledFiles.push(cssPath);
          } else {
            errors.push(`Failed to compile: ${relativePath}`);
          }
        });
        compilePromises.push(promise);
      }
    }
  }
}