import { InternalServerErrorException, Logger } from '@nestjs/common';

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
 * without leaking internal details to the client.
 */
export function throwUnexpectedError(
  error: unknown,
  response: string | Record<string, unknown> = 'Ocurrio un error inesperado',
  logger: Logger = defaultLogger,
): never {
  logger.error(error);
  throw new InternalServerErrorException(response);
}

/**
 * Run a Prisma write and normalise any failure into an
 * `InternalServerErrorException` tagged with a caller-provided code.
 */
export async function runPrismaWrite<T>(
  operation: () => Promise<T>,
  errorCode: string,
  logger: Logger = defaultLogger,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    logger.error(error);
    throw new InternalServerErrorException({
      message: 'Ocurrio un error',
      code: errorCode,
    });
  }
}
