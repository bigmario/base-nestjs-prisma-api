import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { hashSync } from 'bcrypt';
import { PrismaService } from '@core/prisma/services/prisma.service';
import { Prisma } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '@core/email/services/email.service';

@Injectable()
export class AuthRepository {
  constructor(
    private readonly prismaService: PrismaService,
    public readonly jwtService: JwtService,
    public readonly mailService: EmailService,
    private configService: ConfigService,
  ) {}

  public async getSessionInfo(findOptions: Prisma.sessionFindFirstArgs) {
    return await this.prismaService.session.findFirst(findOptions);
  }

  public async updateMetadata(sessionId: any) {
    await this.prismaService.session.update({
      where: { id: sessionId },
      data: { timesLoggedIn: { increment: 1 }, lastAccess: new Date() },
    });
  }

  public async sendRecoveryMail(
    findOptions: Prisma.sessionFindFirstOrThrowArgs,
  ) {
    const session = await this.prismaService.session.findFirstOrThrow(
      findOptions,
    );

    const payload = { sub: session['user'].id };

    const token = this.jwtService.sign(payload, { expiresIn: '15min' });
    const link = `http://myfrontend.com/recovery?token=${token}`;
    await this.prismaService.session.update({
      where: {
        id: session.id,
      },
      data: {
        recoveryToken: token,
      },
    });

    const mailSent = await this.mailService.sendPassRecoveryMail(
      session.email,
      link,
    );

    if (mailSent['accepted'].length === 0) {
      throw new InternalServerErrorException('Recovery Mail Not Sent');
    }

    return {
      message: 'Recovery Mail Successfully Sent',
    };
  }

  public async resetPassword(token, newPassword) {
    try {
      const payload = this.jwtService.verify(token);
      // payload.sub

      const session = await this.prismaService.session.findFirstOrThrow({
        where: {
          user: {
            id: payload.sub,
          },
        },
        include: {
          user: true,
        },
      });

      if (session.recoveryToken !== token) {
        throw new BadRequestException('Unauthorized');
      }
      const hash = hashSync(newPassword, 10);
      await this.prismaService.session.update({
        where: {
          id: session.id,
        },
        data: {
          recoveryToken: null,
          password: hash,
        },
      });
      return { message: 'Password Changed' };
    } catch (error) {
      throw new InternalServerErrorException(`Error ${error}`);
    }
  }
}
