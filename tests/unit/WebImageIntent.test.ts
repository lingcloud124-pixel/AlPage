import { describe, expect, test } from 'vitest';
import { classifyImageIntent } from '../../web/src/image-intent';

describe('web image intent classifier', () => {
  test('treats "把图片作为主题" as primary image intent', () => {
    const result = classifyImageIntent('把图片作为主题设计一个国庆主题包');
    expect(result.role).toBe('primary');
  });

  test('treats explicit reference wording as reference image intent', () => {
    const result = classifyImageIntent('餐卡这张图参考一下这个风格');
    expect(result.role).toBe('reference');
  });

  test('gives primary strong directive higher priority than reference wording', () => {
    const result = classifyImageIntent('参考这张图，但就用这个生成');
    expect(result.role).toBe('primary');
  });
});
