import { describe, it, expect } from 'vitest';
import { computeHealthScore } from '../src/core/auditor.js';

describe('computeHealthScore', () => {
  it('returns 100 for perfect docs', () => {
    expect(computeHealthScore(10, 0, 0, 0)).toBe(100);
  });

  it('returns 100 for no docs', () => {
    expect(computeHealthScore(0, 0, 0, 0)).toBe(100);
  });

  it('deducts 2 per doc without frontmatter', () => {
    expect(computeHealthScore(10, 5, 0, 0)).toBe(90);
  });

  it('deducts 3 per stale doc', () => {
    expect(computeHealthScore(10, 0, 3, 0)).toBe(91);
  });

  it('deducts 1 per orphaned ref', () => {
    expect(computeHealthScore(10, 0, 0, 5)).toBe(95);
  });

  it('floors at 0', () => {
    expect(computeHealthScore(10, 50, 50, 50)).toBe(0);
  });

  it('combines all penalties', () => {
    // 100 - (2*2) - (1*3) - (3*1) = 100 - 4 - 3 - 3 = 90
    expect(computeHealthScore(10, 2, 1, 3)).toBe(90);
  });
});
