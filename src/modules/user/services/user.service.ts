import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { UserRepository } from '@user/repositories/user.repository';

import { CreateUserDto } from '@user/dtos/create-user.dto';
import {
  AllUsersQueryParams,
  UserRolesQueryParams,
  UserStatusesQueryParams,
} from '@user/dtos/query-params.dto';
import {
  FindManySessionRolesArgs,
  FindManySessionStatusesArgs,
  FindManyUsersArgs,
} from '@user/types/find-many.types';
import { USER_BASE_ROUTE } from '@user/constants/routes.const';
import { UpdateUserDto } from '@user/dtos/update-user.dto';

// ── Cache key prefixes & TTLs (ms) ──────────────────────────

/** Catalog data — very low volatility. */
const CACHE_ROLES_PREFIX = 'api:user:roles';
const CACHE_STATUSES_PREFIX = 'api:user:statuses';
const CACHE_CATALOG_TTL = 3_600_000; // 1 hour

/** User list — medium-high volatility, paginated. */
const CACHE_USER_LIST_PREFIX = 'api:user:list';
const CACHE_USER_LIST_TTL = 120_000; // 2 minutes

/** Single user — medium volatility. */
const CACHE_USER_ITEM_PREFIX = 'api:user:item';
const CACHE_USER_ITEM_TTL = 600_000; // 10 minutes

@Injectable()
export class UserService {
  private userSelect: Prisma.userSelect = {
    id: true,
    name: true,
    lastName: true,
    identityCard: true,
    identityCardprefix: true,
    primaryPhone: true,
    secondaryPhone: true,
    createdAt: true,
    updatedAt: true,
    imgUrl: true,
    session: true,
  };

  constructor(private readonly userRepository: UserRepository) {}

  public async getAllUserRoles(queryParams: UserRolesQueryParams) {
    const findManyArgs: FindManySessionRolesArgs = {
      limit: queryParams.limit,
      page: queryParams.page,
      select: { id: true, name: true },
      where: { deletedAt: null },
    };

    const keySuffix = `page=${queryParams.page ?? 1}&limit=${queryParams.limit ?? 10}`;

    const userRoles =
      await this.userRepository.findAllCached<FindManySessionRolesArgs>(
        this.userRepository.prismaService.session_rol,
        {
          paginate: true,
          resourceBaseUrl: USER_BASE_ROUTE + '/roles',
          findManyArgs,
        },
        {
          keyPrefix: CACHE_ROLES_PREFIX,
          keySuffix,
          ttl: CACHE_CATALOG_TTL,
        },
      );

    return userRoles;
  }

  public async getAllUserStatuses(queryParams: UserStatusesQueryParams) {
    const findManyArgs: FindManySessionStatusesArgs = {
      limit: queryParams.limit,
      page: queryParams.page,
      select: { id: true, name: true },
      where: { deletedAt: null },
    };

    const keySuffix = `page=${queryParams.page ?? 1}&limit=${queryParams.limit ?? 10}`;

    const userStatuses =
      await this.userRepository.findAllCached<FindManySessionStatusesArgs>(
        this.userRepository.prismaService.session_status,
        {
          paginate: true,
          resourceBaseUrl: USER_BASE_ROUTE + '/statuses',
          findManyArgs,
        },
        {
          keyPrefix: CACHE_STATUSES_PREFIX,
          keySuffix,
          ttl: CACHE_CATALOG_TTL,
        },
      );

    return userStatuses;
  }

  public async getAllUsers(queryParams: AllUsersQueryParams) {
    const responseData = [];
    const findManyArgs: FindManyUsersArgs = {
      limit: queryParams.limit,
      page: queryParams.page,
      select: this.userSelect,
      where: {
        deletedAt: null,
        ...(queryParams.search && {
          OR: this.userRepository.buildFilters(queryParams.search, [
            'name',
            'lastName',
            'identityCard',
          ]),
        }),
      },
      include: {
        session: {
          select: {
            email: true,
            rolId: true,
          },
        },
      },
    };

    const keySuffix = [
      `page=${queryParams.page ?? 1}`,
      `limit=${queryParams.limit ?? 10}`,
      ...(queryParams.search ? [`search=${queryParams.search}`] : []),
    ].join('&');

    const users = await this.userRepository.findAllCached<FindManyUsersArgs>(
      this.userRepository.prismaService.user,
      {
        paginate: true,
        resourceBaseUrl: USER_BASE_ROUTE,
        findManyArgs,
      },
      {
        keyPrefix: CACHE_USER_LIST_PREFIX,
        keySuffix,
        ttl: CACHE_USER_LIST_TTL,
      },
    );

    for (const user of users.data) {
      responseData.push({
        id: user.id,
        name: user.name,
        lastName: user.lastName,
        identityCard: user.identityCard,
        identityCardprefix: user.identityCardprefix,
        email: user.session.email,
        rolId: user.session.rolId,
        primaryPhone: user.primaryPhone,
        secondaryPhone: user?.secondaryPhone || null,
        imgUrl: user?.imgUrl || null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    }

    const responseMeta = users.meta;

    return {
      data: responseData,
      meta: responseMeta,
    };
  }

  public async getUserById(id: number) {
    try {
      const findOneOptions: Prisma.userFindFirstOrThrowArgs = {
        where: { id, deletedAt: null },
        select: this.userSelect,
      };

      const user =
        await this.userRepository.findOneCached<Prisma.userFindFirstOrThrowArgs>(
          this.userRepository.prismaService.user,
          findOneOptions,
          {
            keyPrefix: CACHE_USER_ITEM_PREFIX,
            keySuffix: String(id),
            ttl: CACHE_USER_ITEM_TTL,
          },
        );
      const response = {
        id: user.id,
        name: user.name,
        lastName: user.lastName,
        identityCard: user.identityCard,
        identityCardprefix: user.identityCardprefix,
        primaryPhone: user.primaryPhone,
        secondaryPhone: user?.secondaryPhone || null,
        imgUrl: user.imgUrl,
        email: user.session.email,
        roleId: user.session.rolId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
      return response;
    } catch (error) {
      switch (error.code) {
        case 'P2025':
          throw new BadRequestException(`No existe el usuario con el id ${id}`);

        default:
          console.log(error);
          throw new InternalServerErrorException(`Ocurrio un error inesperado`);
      }
    }
  }

  public async createUser(body: CreateUserDto) {
    const newUser = await this.userRepository.createUser({
      body,
      newResourceUrl: true,
    });

    // Invalidate user list caches after creating a new user
    await this.userRepository.invalidateModelCache(CACHE_USER_LIST_PREFIX);

    return { message: 'Usuario creado con éxito', url: newUser.url };
  }

  public async updateUser(id: number, body: UpdateUserDto) {
    const updatedUser = await this.userRepository.updateUser({
      id,
      body,
      resourceUrl: true,
    });

    // Invalidate both the specific item and all list caches
    await this.userRepository.invalidateModelCache(CACHE_USER_ITEM_PREFIX, id);
    await this.userRepository.invalidateModelCache(CACHE_USER_LIST_PREFIX);

    return { message: 'Usuario creado con éxito', url: updatedUser.url };
  }

  public async deleteUser(id: number) {
    try {
      await this.userRepository.softDelete(
        this.userRepository.prismaService.user,
        id,
        CACHE_USER_ITEM_PREFIX,
      );

      // Also invalidate list caches
      await this.userRepository.invalidateModelCache(CACHE_USER_LIST_PREFIX);

      return { message: 'Usuario eliminado con éxito' };
    } catch (error) {
      switch (error.code) {
        case 'P2025':
          throw new BadRequestException(`No existe el usuario con el id ${id}`);

        default:
          console.log(error);
          throw new InternalServerErrorException({
            message: 'Ocurrio un error desconocido al borrar al usuario',
          });
      }
    }
  }
}
