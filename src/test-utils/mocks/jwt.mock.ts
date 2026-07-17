export const createMockJwtService = () => ({
  sign: jest.fn(() => 'mock-jwt-token'),
  decode: jest.fn(() => ({
    payload: {
      jti: 'mock-jti',
      exp: Math.floor(Date.now() / 1000) + 3600,
      id: 1,
      typeId: 1,
      rolId: 1,
    },
  })),
  verify: jest.fn(() => ({ sub: 1 })),
});
