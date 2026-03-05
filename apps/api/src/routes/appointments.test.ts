import Fastify from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { registerAppointments } from './appointments.js';

function createMockPrisma() {
  const demoResult = {
    base: { tzUtc: { id: 'tz1' }, country: { id: 'c1' }, office: { id: 'o1' } },
    lawyer: { id: 'l1', email: 'demo.lawyer@challenge.local', fullName: 'Demo Lawyer' },
    calendar: { id: 'cal1', name: 'Demo (personal)' }
  };
  const appointments = [
    {
      id: 'apt1',
      subject: 'Consult',
      mode: 'VIDEO_CALL',
      status: 'SCHEDULED',
      startsAtUtc: new Date(),
      endsAtUtc: new Date(),
      scheduledTimeZone: { ianaName: 'UTC' },
      scheduledOffsetMinutes: 0
    }
  ];
  return {
    timeZone: { upsert: jest.fn().mockResolvedValue({ id: 'tz1' }) },
    country: { upsert: jest.fn().mockResolvedValue({ id: 'c1' }) },
    office: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'o1' }) },
    lawyer: { upsert: jest.fn().mockResolvedValue(demoResult.lawyer) },
    calendar: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue(demoResult.calendar) },
    appointment: {
      findMany: jest.fn().mockResolvedValue(appointments),
      create: jest.fn().mockResolvedValue({
        id: 'apt2',
        subject: 'New',
        mode: 'VIDEO_CALL',
        startsAtUtc: new Date(),
        endsAtUtc: new Date(),
        scheduledTimeZone: { ianaName: 'America/Argentina/Buenos_Aires' },
        scheduledOffsetMinutes: -180
      })
    },
    demoResult,
    appointments
  };
}

describe('registerAppointments', () => {
  it('GET /api/appointments returns items when no query param (default demo)', async () => {
    const mock = createMockPrisma();
    const app = Fastify();
    registerAppointments(app, mock as unknown as PrismaClient);
    const res = await app.inject({ method: 'GET', url: '/api/appointments' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.items).toBeDefined();
  });

  it('GET /api/appointments returns items array', async () => {
    const mock = createMockPrisma();
    const app = Fastify();
    registerAppointments(app, mock as unknown as PrismaClient);
    const res = await app.inject({
      method: 'GET',
      url: '/api/appointments?lawyerEmail=demo.lawyer@challenge.local'
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.items).toBeDefined();
    expect(Array.isArray(body.items)).toBe(true);
  });

  it('POST /api/appointments returns 400 when subject is missing', async () => {
    const mock = createMockPrisma();
    const app = Fastify();
    registerAppointments(app, mock as unknown as PrismaClient);
    const res = await app.inject({
      method: 'POST',
      url: '/api/appointments',
      payload: {
        startsAtLocal: '2025-12-01T10:00',
        durationMinutes: 30,
        scheduledTimeZone: 'UTC',
        lawyerEmail: 'demo.lawyer@challenge.local'
      }
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.payload);
    expect(body.error).toContain('subject');
  });

  it('POST /api/appointments returns 400 when startsAtLocal is missing', async () => {
    const mock = createMockPrisma();
    const app = Fastify();
    registerAppointments(app, mock as unknown as PrismaClient);
    const res = await app.inject({
      method: 'POST',
      url: '/api/appointments',
      payload: {
        subject: 'Consult',
        durationMinutes: 30,
        scheduledTimeZone: 'UTC',
        lawyerEmail: 'demo.lawyer@challenge.local'
      }
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.payload);
    expect(body.error).toContain('startsAtLocal');
  });

  it('POST /api/appointments returns 400 when durationMinutes is invalid', async () => {
    const mock = createMockPrisma();
    const app = Fastify();
    registerAppointments(app, mock as unknown as PrismaClient);
    const res = await app.inject({
      method: 'POST',
      url: '/api/appointments',
      payload: {
        subject: 'Consult',
        startsAtLocal: '2025-12-01T10:00',
        durationMinutes: 99,
        scheduledTimeZone: 'UTC',
        lawyerEmail: 'demo.lawyer@challenge.local'
      }
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.payload);
    expect(body.error).toContain('durationMinutes');
  });

  it('POST /api/appointments returns 400 for invalid datetime', async () => {
    const mock = createMockPrisma();
    const app = Fastify();
    registerAppointments(app, mock as unknown as PrismaClient);
    const res = await app.inject({
      method: 'POST',
      url: '/api/appointments',
      payload: {
        subject: 'Consult',
        startsAtLocal: 'not-a-date',
        durationMinutes: 30,
        scheduledTimeZone: 'UTC',
        lawyerEmail: 'demo.lawyer@challenge.local'
      }
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.payload);
    expect(body.error).toMatch(/invalid|startsAtLocal|scheduledTimeZone/);
  });

  it('GET /api/appointments uses lawyer from query when not demo email', async () => {
    const mock = createMockPrisma();
    const app = Fastify();
    registerAppointments(app, mock as unknown as PrismaClient);
    const res = await app.inject({
      method: 'GET',
      url: '/api/appointments?lawyerEmail=other@lawyer.com'
    });
    expect(res.statusCode).toBe(200);
    expect(mock.lawyer.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'other@lawyer.com' } })
    );
  });

  it('POST /api/appointments uses defaults for mode and duration', async () => {
    const mock = createMockPrisma();
    const app = Fastify();
    registerAppointments(app, mock as unknown as PrismaClient);
    const res = await app.inject({
      method: 'POST',
      url: '/api/appointments',
      payload: {
        subject: 'Minimal',
        startsAtLocal: '2025-12-01T10:00',
        scheduledTimeZone: 'UTC',
        lawyerEmail: 'demo.lawyer@challenge.local'
      }
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.ok).toBe(true);
    expect(body.appointment).toBeDefined();
  });

  it('POST /api/appointments returns 200 and appointment on success', async () => {
    const mock = createMockPrisma();
    const app = Fastify();
    registerAppointments(app, mock as unknown as PrismaClient);
    const res = await app.inject({
      method: 'POST',
      url: '/api/appointments',
      payload: {
        subject: 'New consult',
        startsAtLocal: '2025-12-01T14:00',
        durationMinutes: 30,
        scheduledTimeZone: 'America/Argentina/Buenos_Aires',
        lawyerEmail: 'demo.lawyer@challenge.local'
      }
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.ok).toBe(true);
    expect(body.appointment).toBeDefined();
    expect(body.appointment.subject).toBe('New');
  });
});
