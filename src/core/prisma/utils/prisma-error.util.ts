import {
  ConflictException,
  HttpException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

const defaultLogger = new Logger('PrismaError');

/**
 * Whether an error represents a missing record, either the Prisma
 * "record not found" code (`P2025`) or the `findFirstOrThrow` rejection
 * (`NotFoundError`).
 */
export function isNotFoundError(error: unknown): boolean {
  const err = error as { code?: string; name?: string } | null | undefined;
  return err?.code === 'P2025' || err?.name === 'NotFoundError';
}

/**
 * Log an unexpected error and rethrow it as an `InternalServerErrorException`
 * without leaking internal details to the client. Intentional
 * `HttpException`s raised downstream are re-thrown untouched.
 */
export function throwUnexpectedError(
  error: unknown,
  response: string | Record<string, unknown> = 'Ocurrio un error inesperado',
  logger: Logger = defaultLogger,
): never {
  if (error instanceof HttpException) {
    throw error;
  }
  logger.error(error);
  throw new InternalServerErrorException(response);
}

/**
 * Translate a persistence-layer failure into a meaningful HTTP exception.
 *
 * Known Prisma error codes are mapped to specific responses so that
 * client-caused failures (duplicate value, missing record) are not masked
 * as generic 500s. Any other error is logged and rethrown as a 500 without
 * leaking internals to the client.
 */
export function mapPrismaError(
  error: unknown,
  code: string,
  logger: Logger = defaultLogger,
): HttpException {
  if (error instanceof HttpException) {
    return error;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002': {
        const target = (error.meta?.target as string[] | undefined)?.join(', ');
        return new ConflictException({
          message: target
            ? `A record with this ${target} already exists`
            : 'A record with these unique values already exists',
          code,
        });
      }
      case 'P2025':
        return new NotFoundException({
          message: 'The requested record does not exist',
          code,
        });
    }
  }

  logger.error(`Unexpected persistence error (${code})`, error as Error);
  return new InternalServerErrorException({
    message: 'Ocurrio un error',
    code,
  });
}

/**
 * Run a Prisma write and normalise any failure via {@link mapPrismaError},
 * tagging the resulting exception with a caller-provided code.
 */
export async function runPrismaWrite<T>(
  operation: () => Promise<T>,
  errorCode: string,
  logger: Logger = defaultLogger,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw mapPrismaError(error, errorCode, logger);
  }
}
