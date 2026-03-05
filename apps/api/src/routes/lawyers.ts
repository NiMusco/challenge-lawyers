import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { getOrCreateDemoLawyer, createLawyerWithCalendar } from '../domain/demoContext.js';

export function registerLawyers(app: FastifyInstance, prisma: PrismaClient): void {
  app.post('/api/bootstrap', async () => {
    const result = await getOrCreateDemoLawyer(prisma);
    return {
      ok: true,
      ids: {
        timeZoneId: result.tzUtc.id,
        countryId: result.country.id,
        officeId: result.office.id,
        lawyerId: result.lawyer.id,
        calendarId: result.calendar.id
      }
    };
  });

  app.get('/api/lawyers', async () => {
    await getOrCreateDemoLawyer(prisma);

    const lawyers = await prisma.lawyer.findMany({
      where: { isActive: true },
      orderBy: { fullName: 'asc' },
      select: { id: true, email: true, fullName: true }
    });

    const calendars = await prisma.calendar.findMany({
      where: { ownerLawyerId: { in: lawyers.map((l) => l.id) } },
      orderBy: { createdAt: 'asc' },
      select: { id: true, ownerLawyerId: true, name: true }
    });

    const firstCalendarByOwner = new Map<string, { id: string; name: string }>();
    for (const c of calendars) {
      if (!firstCalendarByOwner.has(c.ownerLawyerId)) firstCalendarByOwner.set(c.ownerLawyerId, { id: c.id, name: c.name });
    }

    return {
      items: lawyers.map((l) => ({
        id: l.id,
        email: l.email,
        fullName: l.fullName,
        personalCalendar: firstCalendarByOwner.get(l.id) ?? null
      }))
    };
  });

  app.post('/api/lawyers', async (req, reply) => {
    const body = (req.body ?? {}) as Partial<{ email: string; fullName: string }>;
    const email = (body.email ?? '').trim().toLowerCase();
    const fullName = (body.fullName ?? '').trim();

    if (!email) return reply.code(400).send({ ok: false, error: 'email is required' });
    if (!fullName) return reply.code(400).send({ ok: false, error: 'fullName is required' });

    try {
      const result = await createLawyerWithCalendar(prisma, { email, fullName });
      return {
        ok: true,
        lawyer: { id: result.lawyer.id, email: result.lawyer.email, fullName: result.lawyer.fullName },
        calendar: { id: result.calendar.id, name: result.calendar.name }
      };
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err?.code === 'P2002') {
        return reply.code(409).send({ ok: false, error: 'lawyer already registered with that email' });
      }
      throw e;
    }
  });
}
