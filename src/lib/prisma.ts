import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaDatabaseUrl?: string;
};

const DEFAULT_RUNTIME_CONNECTION_LIMIT = "5";
const DEFAULT_POOL_TIMEOUT = "30";
const DEFAULT_CONNECT_TIMEOUT = "15";
const DEFAULT_MAX_IDLE_CONNECTION_LIFETIME = "60";
type PrismaLogLevel = "query" | "info" | "warn" | "error";
const VALID_PRISMA_LOG_LEVELS = new Set<PrismaLogLevel>(["query", "info", "warn", "error"]);

function getPrismaLogLevels(): PrismaLogLevel[] {
  const configuredLevels = process.env.PRISMA_LOG_LEVELS;

  if (configuredLevels) {
    return configuredLevels
      .split(",")
      .map((level) => level.trim())
      .filter((level): level is PrismaLogLevel => VALID_PRISMA_LOG_LEVELS.has(level as PrismaLogLevel));
  }

  return process.env.NODE_ENV === "development" ? ["warn"] : [];
}

function setSearchParam(url: URL, name: string, fallbackValue: string, overrideValue?: string) {
  if (overrideValue) {
    url.searchParams.set(name, overrideValue);
    return;
  }

  if (!url.searchParams.has(name)) {
    url.searchParams.set(name, fallbackValue);
  }
}

function getRuntimeDatabaseUrl() {
  const databaseUrl =
    process.env.NODE_ENV === "development" && process.env.DIRECT_DATABASE_URL
      ? process.env.DIRECT_DATABASE_URL
      : process.env.DATABASE_URL;

  if (!databaseUrl) {
    return undefined;
  }

  try {
    const url = new URL(databaseUrl);
    const isPostgres = url.protocol === "postgresql:" || url.protocol === "postgres:";

    if (!isPostgres) {
      return databaseUrl;
    }

    setSearchParam(
      url,
      "connection_limit",
      DEFAULT_RUNTIME_CONNECTION_LIMIT,
      process.env.PRISMA_CONNECTION_LIMIT,
    );
    setSearchParam(url, "pool_timeout", DEFAULT_POOL_TIMEOUT, process.env.PRISMA_POOL_TIMEOUT);
    setSearchParam(url, "connect_timeout", DEFAULT_CONNECT_TIMEOUT, process.env.PRISMA_CONNECT_TIMEOUT);
    setSearchParam(
      url,
      "max_idle_connection_lifetime",
      DEFAULT_MAX_IDLE_CONNECTION_LIFETIME,
      process.env.PRISMA_MAX_IDLE_CONNECTION_LIFETIME,
    );

    return url.toString();
  } catch {
    return databaseUrl;
  }
}

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL || process.env.DIRECT_DATABASE_URL);
}

const runtimeDatabaseUrl = getRuntimeDatabaseUrl();
const cachedPrisma = globalForPrisma.prisma;
const cachedPrismaDatabaseUrl = globalForPrisma.prismaDatabaseUrl;

if (process.env.NODE_ENV !== "production" && cachedPrisma && cachedPrismaDatabaseUrl !== runtimeDatabaseUrl) {
  void cachedPrisma.$disconnect().catch(() => undefined);
  globalForPrisma.prisma = undefined;
  globalForPrisma.prismaDatabaseUrl = undefined;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(runtimeDatabaseUrl ? { datasources: { db: { url: runtimeDatabaseUrl } } } : {}),
    log: getPrismaLogLevels(),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaDatabaseUrl = runtimeDatabaseUrl;
}
