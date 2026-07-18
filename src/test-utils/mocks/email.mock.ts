export const createMockEmailService = () => ({
  sendPassRecoveryMail: jest.fn().mockResolvedValue({ accepted: ['test@test.com'] }),
});
