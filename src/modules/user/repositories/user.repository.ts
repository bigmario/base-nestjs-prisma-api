import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { hashSync } from 'bcryptjs';

import { PrismaService } from '@core/prisma/services/prisma.service';
import { PaginationService } from '@core/pagination/services/pagination.service';
import { RedisCacheService } from '@core/cache/redis-cache.service';
import { runPrismaWrite } from '@core/prisma/utils/prisma-error.util';

import { CreateUserDto } from '@user/dtos/create-user.dto';
import { BaseCreateBodyDto } from '@core/dtos/base-create-body.dto';
import { USER_BASE_ROUTE } from '@user/constants/routes.const';
import { BaseRepository } from '@core/prisma/repositories/base.repository';
import { BaseUpdateBodyDto } from '@core/dtos/base-update-body.dto';
import { UpdateUserDto } from '@user/dtos/update-user.dto';

@Injectable()
export class UserRepository extends BaseRepository {
  constructor(
    public readonly prismaService: PrismaService,
    paginationService: PaginationService,
    cacheService: RedisCacheService,
  ) {
    super(paginationService, cacheService);
  }
  public async updateUser(updateOptions: BaseUpdateBodyDto<UpdateUserDto>) {
    return this.prismaService.$transaction(
      async (prismaTransactionClient: Prisma.TransactionClient) => {
        const userData: Prisma.userUpdateArgs['data'] = {
          name: updateOptions.body.name,
          lastName: updateOptions.body.lastName,
          identityCard: updateOptions.body.identityCard,
          identityCardprefix: updateOptions.body.identityCardPrefix,
          primaryPhone: updateOptions.body.primaryPhone,
          secondaryPhone: updateOptions.body.secondaryPhone,
          imgUrl: updateOptions.body.imgUrl,
          session: {
            update: {
              rolId: updateOptions.body.rolId,
            },
          },
        };

        const updatedUser: any = await runPrismaWrite(
          () =>
            prismaTransactionClient.user.update({
              where: { id: updateOptions.id },
              data: userData,
            }),
          'UU001',
        );

        if (updateOptions.resourceUrl) {
          const url: string = this.paginationService.buildUrl(
            updatedUser.id,
            USER_BASE_ROUTE,
          );

          updatedUser.url = url;
        }

        return updatedUser;
      },
    );
  }

  public async createUser(createOptions: BaseCreateBodyDto<CreateUserDto>) {
    return this.prismaService.$transaction(
      async (prismaTransactionClient: Prisma.TransactionClient) => {
        const sessionData: Prisma.sessionCreateArgs['data'] = {
          email: createOptions.body.email,
          password: hashSync(createOptions.body.password, 10),
          rolId: createOptions.body.rolId,
          typeId: 1,
          statusId: 1,
        };

        const newSession = await runPrismaWrite(
          () => prismaTransactionClient.session.create({ data: sessionData }),
          'CS001',
        );

        const userData: Prisma.userCreateArgs['data'] = {
          name: createOptions.body.name,
          lastName: createOptions.body.lastName,
          identityCard: createOptions.body.identityCard,
          identityCardprefix: createOptions.body.identityCardPrefix,
          primaryPhone: createOptions.body.primaryPhone,
          session: { connect: { id: newSession.id } },
        };

        const newUser: any = await runPrismaWrite(
          () => prismaTransactionClient.user.create({ data: userData }),
          'CU001',
        );

        if (createOptions.newResourceUrl) {
          const url: string = this.paginationService.buildUrl(
            newUser.id,
            USER_BASE_ROUTE,
          );

          newUser.url = url;
        }

        return newUser;
      },
    );
  }
}
