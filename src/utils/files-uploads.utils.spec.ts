import { editFileName } from './files-uploads.utils';

jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'a'.repeat(64)),
}));

describe('files-uploads.utils', () => {
  describe('editFileName', () => {
    it('should generate a nanoid filename preserving the extension', () => {
      const callback = jest.fn();

      editFileName({}, { originalname: 'photo.png' }, callback);

      expect(callback).toHaveBeenCalledWith(null, `${'a'.repeat(64)}.png`);
    });

    it('should handle files without an extension', () => {
      const callback = jest.fn();

      editFileName({}, { originalname: 'README' }, callback);

      expect(callback).toHaveBeenCalledWith(null, 'a'.repeat(64));
    });
  });
});
