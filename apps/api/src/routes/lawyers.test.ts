import Fastify from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { registerLawyers } from './lawyers.js';

function createMockPrisma() {
  const lawyers = [
    { id: 'l1', email: 'demo.lawyer@challenge.local', fullName: 'Demo Lawyer' }
  ];
  const calendars = [
    { id: 'c1', ownerLawyerId: 'l1', name: 'Demo Lawyer (personal)' }
  ];
  const demoResult = {
    base: { tzUtc: { id: 'tz1' }, country: { id: 'c1' }, office: { id: 'o1' } },
    lawyer: { id: 'l1', email: 'demo.lawyer@challenge.local', fullName: 'Demo Lawyer' },
    calendar: { id: 'cal1', name: 'Demo Lawyer (personal)' }
  };
  return {
    timeZone: { upsert: jest.fn().mockResolvedValue({ id: 'tz1' }) },
    country: { upsert: jest.fn().mockResolvedValue({ id: 'c1' }) },
    office: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'o1' }) },
    lawyer: {
      upsert: jest.fn().mockResolvedValue(demoResult.lawyer),
      create: jest.fn().mockResolvedValue({ id: 'l2', email: 'new@test.com', fullName: 'New' })
    },
    calendar: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'cal2', name: 'New (personal)' })
    },
    $transaction: jest.fn((fn: (tx: any) => Promise<any>) =>
      fn({
        lawyer: { create: jest.fn().mockResolvedValue({ id: 'l2', email: 'new@test.com', fullName: 'New' }) },
        calendar: { create: jest.fn().mockResolvedValue({ id: 'cal2', name: 'New (personal)' }) }
      })
    ),
    lawyers,
    calendars,
    demoResult
  };
}

describe('registerLawyers', () => {
  it('POST /api/bootstrap returns ids', async () => {
    const mock = createMockPrisma();
    const app = Fastify();
    registerLawyers(app, mock as unknown as PrismaClient);
    const res = await app.inject({
      method: 'POST',
      url: '/api/bootstrap'
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.ok).toBe(true);
    expect(body.ids).toHaveProperty('lawyerId');
    expect(body.ids).toHaveProperty('calendarId');
  });

  it('GET /api/lawyers returns items array', async () => {
    const mock = createMockPrisma();
    (mock as any).lawyer.findMany = jest.fn().mockResolvedValue(mock.lawyers);
    (mock as any).calendar.findMany = jest.fn().mockResolvedValue(mock.calendars);
    const app = Fastify();
    registerLawyers(app, mock as unknown as PrismaClient);
    const res = await app.inject({ method: 'GET', url: '/api/lawyers' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.items).toBeDefined();
    expect(Array.isArray(body.items)).toBe(true);
  });

  it('POST /api/lawyers trims and lowercases email', async () => {
    const mock = createMockPrisma();
    const app = Fastify();
    registerLawyers(app, mock as unknown as PrismaClient);
    const res = await app.inject({
      method: 'POST',
      url: '/api/lawyers',
      payload: { email: '  UPPER@TEST.COM  ', fullName: 'Trimmed' }
    });
    expect(res.statusCode).toBe(200);
    expect((mock as any).$transaction).toHaveBeenCalled();
  });

  it('POST /api/lawyers returns 400 when email is missing', async () => {
    const mock = createMockPrisma();
    const app = Fastify();
    registerLawyers(app, mock as unknown as PrismaClient);
    const res = await app.inject({
      method: 'POST',
      url: '/api/lawyers',
      payload: { fullName: 'Someone' }
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.payload);
    expect(body.ok).toBe(false);
    expect(body.error).toContain('email');
  });

  it('POST /api/lawyers returns 400 when fullName is missing', async () => {
    const mock = createMockPrisma();
    const app = Fastify();
    registerLawyers(app, mock as unknown as PrismaClient);
    const res = await app.inject({
      method: 'POST',
      url: '/api/lawyers',
      payload: { email: 'a@b.com' }
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.payload);
    expect(body.error).toContain('fullName');
  });

  it('POST /api/lawyers returns 200 and lawyer/calendar on success', async () => {
    const mock = createMockPrisma();
    const app = Fastify();
    registerLawyers(app, mock as unknown as PrismaClient);
    const res = await app.inject({
      method: 'POST',
      url: '/api/lawyers',
      payload: { email: 'new@test.com', fullName: 'New Lawyer' }
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.ok).toBe(true);
    expect(body.lawyer).toBeDefined();
    expect(body.calendar).toBeDefined();
  });

  it('POST /api/lawyers returns 409 on duplicate email', async () => {
    const mock = createMockPrisma();
    (mock as any).$transaction = jest.fn().mockRejectedValue({ code: 'P2002' });
    const app = Fastify();
    registerLawyers(app, mock as unknown as PrismaClient);
    const res = await app.inject({
      method: 'POST',
      url: '/api/lawyers',
      payload: { email: 'dup@test.com', fullName: 'Dup' }
    });
    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.payload);
    expect(body.ok).toBe(false);
    expect(body.error).toContain('already registered');
  });
});
