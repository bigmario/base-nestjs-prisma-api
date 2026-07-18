import { PrismaClient } from '@prisma/client';

/**
 * Type alias for PrismaClient suitable for use in seeders and
 * transaction callbacks. Represents the query capabilities of
 * PrismaClient without lifecycle methods.
 */
export type PrismaServiceType = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'
>;
