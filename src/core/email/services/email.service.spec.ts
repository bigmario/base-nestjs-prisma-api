import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';

import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;
  let mailerService: { sendMail: jest.Mock };

  beforeEach(async () => {
    mailerService = {
      sendMail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: MailerService, useValue: mailerService },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendConfirmationEMail', () => {
    it('should send a confirmation email using the template', async () => {
      mailerService.sendMail.mockResolvedValue({ accepted: ['x@test.com'] });

      const result = await service.sendConfirmationEMail({ any: true });

      expect(mailerService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ template: 'confirm-email' }),
      );
      expect(result).toEqual({ accepted: ['x@test.com'] });
    });
  });

  describe('sendPassRecoveryMail', () => {
    it('should send a recovery email with the provided link', async () => {
      mailerService.sendMail.mockResolvedValue({ accepted: ['john@test.com'] });

      const result = await service.sendPassRecoveryMail(
        'john@test.com',
        'http://front/recovery?token=abc',
      );

      expect(mailerService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'john@test.com',
          html: expect.stringContaining('http://front/recovery?token=abc'),
        }),
      );
      expect(result).toEqual({ accepted: ['john@test.com'] });
    });
  });
});
