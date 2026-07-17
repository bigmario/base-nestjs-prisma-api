const modelMock = () => ({
  findFirst: jest.fn(),
  findFirstOrThrow: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
});

export const createMockPrismaService = () => {
  const mock = {
    user: modelMock(),
    session: modelMock(),
    session_rol: modelMock(),
    session_status: modelMock(),
    session_type: modelMock(),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn(async (cb) => {
      // Execute the callback passing the mock itself
      return cb(mock);
    }),
  };
  return mock;
};
