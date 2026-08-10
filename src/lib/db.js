import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

let prisma;

const createPrismaClient = () => {
  const url = process.env.DATABASE_URL || 'file:dev.db';
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
};

if (process.env.NODE_ENV === 'production') {
  prisma = createPrismaClient();
} else {
  const SCHEMA_VERSION = "sprint7_v3_followup";
  if (!global.prisma || global.prismaSchemaVersion !== SCHEMA_VERSION) {
    global.prisma = createPrismaClient();
    global.prismaSchemaVersion = SCHEMA_VERSION;
  }
  prisma = global.prisma;
}

export default prisma;
