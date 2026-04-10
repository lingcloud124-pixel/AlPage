import { describe, it, expect } from 'vitest';
import { ThemeUpdater } from '../../src/core/ThemeUpdater.js';

describe('ThemeUpdater Basic Tests', () => {
  it('should create ThemeUpdater instance', () => {
    const themeUpdater = new ThemeUpdater();
    expect(themeUpdater).toBeDefined();
  });

  it('should have processTheme method', () => {
    const themeUpdater = new ThemeUpdater();
    expect(typeof themeUpdater.processTheme).toBe('function');
  });

  it('should have processAll method', () => {
    const themeUpdater = new ThemeUpdater();
    expect(typeof themeUpdater.processAll).toBe('function');
  });
});