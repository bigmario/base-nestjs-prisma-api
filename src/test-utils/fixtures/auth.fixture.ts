export const mockSessionInfo = {
  id: 1,
  typeId: 1,
  rolId: 1,
};

export const mockSessionData = {
  id: 1n,
  email: 'john@test.com',
  password: '$2a$10$hashedpassword',
  user: { id: 1n },
  type: { id: 1, name: 'Web' },
  rol: { id: 1, name: 'Super Admin' },
};

export const mockFullSessionInfo = {
  id: 1n,
  email: 'john@test.com',
  user: {
    id: 1n,
    name: 'John',
    lastName: 'Doe',
    imgUrl: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  type: { id: 1, name: 'Web' },
  rol: { id: 1, name: 'Super Admin' },
};

export const mockLoginResult = {
  access_token: 'mock-jwt-token',
  id: 1n,
  name: 'John',
  lastName: 'Doe',
  imgUrl: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  email: 'john@test.com',
  type: 'Web',
  rol: 'Super Admin',
};

export const mockRecoveryDto = {
  email: 'john@test.com',
};

export const mockResetPassDto = {
  token: 'mock-token',
  newPassword: 'NewPassword123',
};

export const mockLoginDto = {
  username: 'john@test.com',
  password: 'Password123',
};
