import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailService {
  constructor(
    private mailerService: MailerService,
    private configService: ConfigService,
  ) {}

  public async sendConfirmationEMail(_notification: any) {
    const result = await this.mailerService.sendMail({
      to: 'elber.nava17@gmail.com',
      subject: 'testing bro',
      template: 'confirm-email',
    });

    return result;
  }

  public async sendPassRecoveryMail(userEmail: string, link: string | null) {
    const result = await this.mailerService.sendMail({
      to: userEmail,
      subject: 'Email para recuperar contraseña',
      html: `<b>Ingresa a este link => ${link}</b>`,
    });

    return result;
  }
}
