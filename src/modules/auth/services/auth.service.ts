import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { JwtService } from '@nestjs/jwt';
import { compareSync } from 'bcryptjs';
import { nanoid } from 'nanoid/async';
import { IRequest } from '@auth/interfaces/express';

import { AuthRepository } from '@auth/repositories/auth.repository';
import { Prisma } from '@prisma/client';
import { RecoveryDto, ResetPassDto } from '@auth/dto/recovery.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepo: AuthRepository,
    public readonly jwtService: JwtService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  public async validate(email: string, password: string): Promise<any> {
    const findOptions: Prisma.sessionFindFirstArgs = {
      where: { email: email },
      select: {
        id: true,
        email: true,
        password: true,
        user: { select: { id: true } },
        type: { select: { id: true, name: true } },
        rol: { select: { id: true, name: true } },
      },
    };
    const sessionInfo: any = await this.authRepo.getSessionInfo(findOptions);

    if (sessionInfo && compareSync(password, sessionInfo.password)) {
      await this.authRepo.updateMetadata(sessionInfo.id);

      return {
        id: sessionInfo.user.id,
        typeId: sessionInfo.type.id,
        rolId: sessionInfo.rol.id,
      };
    }

    return null;
  }

  public async login(sessionInfo: IRequest['user']): Promise<any> {
    const findOptions: Prisma.sessionFindFirstArgs = {
      where: { user: { id: sessionInfo.id } },
      select: {
        id: true,
        email: true,
        user: {
          select: {
            id: true,
            name: true,
            lastName: true,
            imgUrl: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        type: { select: { id: true, name: true } },
        rol: { select: { id: true, name: true } },
      },
    };
    const fullSessionInfo: any =
      await this.authRepo.getSessionInfo(findOptions);

    return {
      access_token: this.jwtService.sign(sessionInfo, {
        jwtid: await nanoid(),
      }),
      ...fullSessionInfo.user,
      email: fullSessionInfo.email,
      type: fullSessionInfo.type.name,
      rol: fullSessionInfo.rol.name,
    };
  }

  public async logout(req: IRequest) {
    const token = req.headers.authorization.split(' ')[1];
    const decodeToken: any = this.jwtService.decode(token, { complete: true });
    const jti = decodeToken.payload.jti;
    const now = Date.now();
    const exp = decodeToken.payload.exp * 1000;
    const ttlMs = exp - now;

    await this.cacheManager.set(jti, jti, ttlMs > 0 ? ttlMs : 0);

    return { message: 'session closed successfully' };
  }

  public async getMyInfo(sessionInfo: IRequest['user']) {
    const findOptions: Prisma.sessionFindFirstArgs = {
      where: { user: { id: sessionInfo.id } },
      select: {
        id: true,
        email: true,
        user: {
          select: {
            id: true,
            name: true,
            lastName: true,
            imgUrl: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        type: { select: { id: true, name: true } },
        rol: { select: { id: true, name: true } },
      },
    };

    const fullSessionInfo: any =
      await this.authRepo.getSessionInfo(findOptions);

    return {
      ...fullSessionInfo.user,
      email: fullSessionInfo.email,
      type: fullSessionInfo.type.name,
      rol: fullSessionInfo.rol.name,
    };
  }

  public async sendRecoveryMail(recoveryDto: RecoveryDto) {
    try {
      const findOptions: Prisma.sessionFindFirstOrThrowArgs = {
        where: {
          email: recoveryDto.email,
        },
        include: {
          user: true,
        },
      };

      const mail = await this.authRepo.sendRecoveryMail(findOptions);
      return mail;
    } catch (error) {
      switch (error.name) {
        case 'NotFoundError':
          throw new NotFoundException(
            `No existe el usuario con el email ${recoveryDto.email}`,
          );

        default:
          console.log(error);
          throw new InternalServerErrorException(`Ocurrio un error inesperado`);
      }
    }
  }

  public async resetPassword(resetPassDto: ResetPassDto) {
    const mail = await this.authRepo.resetPassword(
      resetPassDto.token,
      resetPassDto.newPassword,
    );
    return mail;
  }
}
