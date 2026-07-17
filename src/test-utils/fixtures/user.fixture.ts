export const mockUser = {
  id: 1n,
  name: 'John',
  lastName: 'Doe',
  identityCard: '12345678',
  identityCardprefix: 'V',
  primaryPhone: '04141234567',
  secondaryPhone: null,
  imgUrl: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  deletedAt: null,
  sessionId: 1n,
  session: {
    email: 'john@test.com',
    rolId: 2,
  },
};

export const mockCreateUserDto = {
  name: 'John',
  lastName: 'Doe',
  email: 'john@test.com',
  password: 'Password123',
  identityCard: '12345678',
  identityCardPrefix: 'V',
  primaryPhone: '04141234567',
  rolId: 2,
};

export const mockUpdateUserDto = {
  name: 'Jane',
};

export const mockUserRoles = [
  { id: 1, name: 'Super Admin' },
  { id: 2, name: 'Admin' },
];

export const mockUserStatuses = [
  { id: 1, name: 'Active' },
  { id: 2, name: 'Inactive' },
];

export const mockPaginatedResult = {
  data: [mockUser],
  meta: {
    totalItems: 1,
    page: 1,
    limit: 10,
    previousPageUrl: null,
    nextPageUrl: null,
    firstPageUrl: 'http://localhost:3000/users?limit=10&page=1',
    lastPageUrl: 'http://localhost:3000/users?limit=10&page=1',
  },
};
