import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { readAllCSS } from '../helpers/read-css';

const projectRoot = process.cwd();

describe('web sidebar history refinement', () => {
  test('hides the sidebar list scrollbar, keeps collapsed rail white, and uses stable white active history items', () => {
    const styles = readAllCSS();

    expect(styles).toContain('.sidebar:not(.expanded) {');
    expect(styles).toContain('background-color: #ffffff;');
    expect(styles).toContain('.sidebar-list {');
    expect(styles).toContain('padding-right: 0;');
    expect(styles).toContain('.sidebar-list::-webkit-scrollbar {');
    expect(styles).toContain('display: none;');
    expect(styles).toContain('scrollbar-width: none;');
    expect(styles).toContain('.sidebar-item {');
    expect(styles).toContain('border: 0.5px solid transparent;');
    expect(styles).toContain('min-height: 36px;');
    expect(styles).toContain('padding: 6px 10px;');
    expect(styles).toContain('gap: 6px;');
    expect(styles).toContain('.sidebar-item:hover {');
    expect(styles).toContain('border-color: transparent;');
    expect(styles).toContain('background-color: #f3f5f8;');
    expect(styles).toContain('.sidebar-item.active {');
    expect(styles).toContain('background-color: #ffffff;');
    expect(styles).toContain('border-color: #e7eaf0;');
    expect(styles).toContain('.sidebar-item-title {');
    expect(styles).toContain('font-size: 13px;');
    expect(styles).toContain('line-height: 20px;');
    expect(styles).toContain('.sidebar-section-title {');
    expect(styles).toContain('padding: 8px 10px 6px;');
    expect(styles).toContain('font-size: 12px;');
    expect(styles).toContain('font-weight: 500;');
  });
});
