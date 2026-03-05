const mockAccess = jest.fn().mockRejectedValue(new Error('not found'));
const mockMkdir = jest.fn().mockResolvedValue(undefined);
jest.mock('node:fs/promises', () => ({
  access: (path: string) => mockAccess(path),
  mkdir: (path: string, opts?: unknown) => mockMkdir(path, opts)
}));

import { setDefaultDatabaseUrl, createPrismaClient, pushPrismaSchema } from './db.js';

describe('setDefaultDatabaseUrl', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.DATABASE_URL;
    delete process.env.AUTO_DB_PUSH;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('does nothing when DATABASE_URL is already set', () => {
    process.env.DATABASE_URL = 'file:/existing.db';
    setDefaultDatabaseUrl();
    expect(process.env.DATABASE_URL).toBe('file:/existing.db');
    expect(process.env.AUTO_DB_PUSH).toBeUndefined();
  });

  it('sets DATABASE_URL and AUTO_DB_PUSH when DATABASE_URL is missing', () => {
    setDefaultDatabaseUrl();
    expect(process.env.DATABASE_URL).toMatch(/^file:.*\.data\/dev\.db$/);
    expect(process.env.AUTO_DB_PUSH).toBe('1');
  });
});

describe('createPrismaClient', () => {
  it('returns a PrismaClient instance', () => {
    const client = createPrismaClient();
    expect(client).toBeDefined();
    expect(client).toHaveProperty('timeZone');
    expect(client).toHaveProperty('lawyer');
    expect(client).toHaveProperty('$connect');
  });
});

describe('pushPrismaSchema', () => {
  const originalEnv = process.env;
  let mockLog: { warn: jest.Mock; info: jest.Mock; error: jest.Mock };

  beforeEach(() => {
    process.env = { ...originalEnv };
    mockLog = { warn: jest.fn(), info: jest.fn(), error: jest.fn() };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('does nothing when DATABASE_URL is not set', async () => {
    delete process.env.DATABASE_URL;
    const app = { log: mockLog } as any;
    await pushPrismaSchema(app);
    expect(mockLog.warn).not.toHaveBeenCalled();
    expect(mockLog.info).not.toHaveBeenCalled();
  });

  it('does nothing when AUTO_DB_PUSH is not enabled', async () => {
    process.env.DATABASE_URL = 'file:/tmp/db.sqlite';
    process.env.AUTO_DB_PUSH = '0';
    const app = { log: mockLog } as any;
    await pushPrismaSchema(app);
    expect(mockLog.info).not.toHaveBeenCalled();
  });

  it('runs when AUTO_DB_PUSH is true (case insensitive)', async () => {
    mockAccess.mockRejectedValue(new Error('not found'));
    process.env.DATABASE_URL = 'file:/tmp/db.sqlite';
    process.env.AUTO_DB_PUSH = 'true';
    const app = { log: mockLog } as any;
    await pushPrismaSchema(app);
    expect(mockLog.warn).toHaveBeenCalled();
  });

  it('calls app.log.warn when schema file is not found', async () => {
    mockAccess.mockRejectedValue(new Error('not found'));
    process.env.DATABASE_URL = 'file:/tmp/db.sqlite';
    process.env.AUTO_DB_PUSH = '1';
    const app = { log: mockLog } as any;
    await pushPrismaSchema(app);
    expect(mockLog.warn).toHaveBeenCalledWith('Schema file not found');
  });

  it('calls app.log.warn when prisma binary is not found', async () => {
    mockAccess.mockImplementation((path: string) =>
      String(path).includes('schema.prisma') ? Promise.resolve() : Promise.reject(new Error('not found'))
    );
    process.env.DATABASE_URL = 'file:/tmp/db.sqlite';
    process.env.AUTO_DB_PUSH = '1';
    const app = { log: mockLog } as any;
    await pushPrismaSchema(app);
    expect(mockLog.warn).toHaveBeenCalledWith('Prisma binary not found');
  });

});
