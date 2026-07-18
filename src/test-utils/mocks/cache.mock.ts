export const createMockCacheManager = () => {
  const store = new Map<string, any>();
  return {
    get: jest.fn(async (key: string) => store.get(key)),
    set: jest.fn(async (key: string, value: any) => {
      store.set(key, value);
    }),
    del: jest.fn(async (key: string) => {
      store.delete(key);
    }),
    reset: jest.fn(async () => {
      store.clear();
    }),
    store,
  };
};
