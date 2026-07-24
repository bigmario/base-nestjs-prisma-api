import { isEmptyObject } from './objects.utils';

describe('objects.utils', () => {
  describe('isEmptyObject', () => {
    it('should return true for an empty object', () => {
      expect(isEmptyObject({})).toBe(true);
    });

    it('should return false for a non-empty object', () => {
      expect(isEmptyObject({ a: 1 })).toBe(false);
    });

    it('should return true for a null/undefined value', () => {
      expect(isEmptyObject(null)).toBe(true);
      expect(isEmptyObject(undefined as unknown as object)).toBe(true);
    });
  });
});
