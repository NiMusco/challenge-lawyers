import { PrismaClient } from '@prisma/client';
import { execFile } from 'node:child_process';
import { access, mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';

export function setDefaultDatabaseUrl(): void {
  if (process.env.DATABASE_URL) return;
  const dbFile = path.resolve(process.cwd(), '../../.data/dev.db');
  process.env.DATABASE_URL = `file:${dbFile}`;
  process.env.AUTO_DB_PUSH = '1';
}

export function createPrismaClient(): PrismaClient {
  return new PrismaClient();
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

function execFileAsync(cmd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { env: process.env }, (err, stdout, stderr) => {
      if (err) return reject(Object.assign(err, { stdout, stderr }));
      resolve({ stdout: String(stdout ?? ''), stderr: String(stderr ?? '') });
    });
  });
}

/** Pushes Prisma schema to DB when AUTO_DB_PUSH is set; no-op otherwise. */
export async function pushPrismaSchema(app: FastifyInstance): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!['1', 'true', 'TRUE', 'yes', 'YES'].includes(String(process.env.AUTO_DB_PUSH ?? ''))) return;

  if (process.env.DATABASE_URL.startsWith('file:')) {
    const dbFile = process.env.DATABASE_URL.slice('file:'.length);
    const dir = path.dirname(dbFile);
    await mkdir(dir, { recursive: true });
  }

  const schemaFromRoot = path.resolve(process.cwd(), 'packages/db/prisma/schema.prisma');
  const schemaFromApi = path.resolve(process.cwd(), '../../packages/db/prisma/schema.prisma');
  const schemaPath = (await fileExists(schemaFromRoot))
    ? schemaFromRoot
    : (await fileExists(schemaFromApi))
      ? schemaFromApi
      : null;

  if (!schemaPath) {
    app.log.warn('Schema file not found');
    return;
  }

  const prismaBinFromRoot = path.resolve(process.cwd(), 'node_modules/.bin/prisma');
  const prismaBinFromApi = path.resolve(process.cwd(), '../../node_modules/.bin/prisma');
  const prismaBin = (await fileExists(prismaBinFromRoot))
    ? prismaBinFromRoot
    : (await fileExists(prismaBinFromApi))
      ? prismaBinFromApi
      : null;

  if (!prismaBin) {
    app.log.warn('Prisma binary not found');
    return;
  }

  try {
    await execFileAsync(prismaBin, ['db', 'push', '--schema', schemaPath, '--accept-data-loss', '--skip-generate']);
    app.log.info('Schema pushed');
  } catch (e) {
    app.log.error({ err: e }, 'Schema push failed');
  }
}
