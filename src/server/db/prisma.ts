import { PrismaClient } from '@prisma/client'
import { requireDatabaseUrl } from '@/server/config/env'

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

// Validate database configuration before creating Prisma client.
requireDatabaseUrl()

export const prisma = global.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}
