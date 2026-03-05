import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';
import { getOrCreateDemoLawyer, getOrCreateLawyerWithCalendar } from '../domain/demoContext.js';

const ALLOWED_DURATIONS = new Set([15, 30, 45, 60, 90, 120]);

export function registerAppointments(app: FastifyInstance, prisma: PrismaClient): void {
  app.get('/api/appointments', async (req) => {
    const query = (req.query ?? {}) as Partial<{ lawyerEmail: string }>;
    const lawyerEmail = (query.lawyerEmail ?? 'demo.lawyer@challenge.local').trim().toLowerCase();

    const lawyerContext =
      lawyerEmail === 'demo.lawyer@challenge.local'
        ? await getOrCreateDemoLawyer(prisma)
        : await getOrCreateLawyerWithCalendar(prisma, { email: lawyerEmail, fullName: 'New Lawyer' });

    const items = await prisma.appointment.findMany({
      where: { calendarId: lawyerContext.calendar.id },
      orderBy: { startsAtUtc: 'desc' },
      take: 50,
      include: { scheduledTimeZone: true }
    });

    return {
      items: items.map((a) => ({
        id: a.id,
        subject: a.subject,
        mode: a.mode,
        status: a.status,
        startsAtUtc: a.startsAtUtc.toISOString(),
        endsAtUtc: a.endsAtUtc.toISOString(),
        scheduledTimeZone: a.scheduledTimeZone.ianaName,
        scheduledOffsetMinutes: a.scheduledOffsetMinutes
      }))
    };
  });

  app.post('/api/appointments', async (req, reply) => {
    const body = (req.body ?? {}) as Partial<{
      subject: string;
      mode: 'IN_PERSON' | 'VIDEO_CALL' | 'PHONE_CALL';
      startsAtLocal: string;
      durationMinutes: number;
      scheduledTimeZone: string;
      lawyerEmail: string;
    }>;

    const subject = (body.subject ?? '').trim();
    const mode = body.mode ?? 'VIDEO_CALL';
    const startsAtLocal = body.startsAtLocal ?? '';
    const durationMinutes = body.durationMinutes ?? 30;
    const scheduledTimeZone = (body.scheduledTimeZone ?? 'UTC').trim();
    const lawyerEmail = (body.lawyerEmail ?? 'demo.lawyer@challenge.local').trim().toLowerCase();

    if (!subject) return reply.code(400).send({ ok: false, error: 'subject is required' });
    if (!startsAtLocal) return reply.code(400).send({ ok: false, error: 'startsAtLocal is required' });
    if (!Number.isFinite(durationMinutes) || !ALLOWED_DURATIONS.has(durationMinutes)) {
      return reply
        .code(400)
        .send({ ok: false, error: `durationMinutes must be one of: ${Array.from(ALLOWED_DURATIONS).join(', ')}` });
    }

    const dtLocal = DateTime.fromISO(startsAtLocal, { zone: scheduledTimeZone });
    if (!dtLocal.isValid) {
      return reply.code(400).send({ ok: false, error: `invalid startsAtLocal or scheduledTimeZone: ${dtLocal.invalidReason ?? 'unknown'}` });
    }

    const dtEndLocal = dtLocal.plus({ minutes: durationMinutes });
    const startsAtUtc = dtLocal.toUTC().toJSDate();
    const endsAtUtc = dtEndLocal.toUTC().toJSDate();

    const lawyerContext =
      lawyerEmail === 'demo.lawyer@challenge.local'
        ? await getOrCreateDemoLawyer(prisma)
        : await getOrCreateLawyerWithCalendar(prisma, { email: lawyerEmail, fullName: 'New Lawyer' });

    const overlapping = await prisma.appointment.findFirst({
      where: {
        calendarId: lawyerContext.calendar.id,
        startsAtUtc: { lt: endsAtUtc },
        endsAtUtc: { gt: startsAtUtc }
      }
    });
    if (overlapping) {
      return reply.code(409).send({ ok: false, error: 'This time slot overlaps an existing appointment' });
    }

    const timeZone = await prisma.timeZone.upsert({
      where: { ianaName: scheduledTimeZone },
      update: {},
      create: { ianaName: scheduledTimeZone }
    });

    const appointment = await prisma.appointment.create({
      data: {
        calendarId: lawyerContext.calendar.id,
        createdByLawyerId: lawyerContext.lawyer.id,
        mode,
        subject,
        startsAtUtc,
        endsAtUtc,
        scheduledTimeZoneId: timeZone.id,
        scheduledOffsetMinutes: dtLocal.offset,
        startsAtLocal: dtLocal.toJSDate(),
        endsAtLocal: dtEndLocal.toJSDate(),
        lawyers: {
          create: [{ lawyerId: lawyerContext.lawyer.id, role: 'ORGANIZER' }]
        }
      },
      include: { scheduledTimeZone: true }
    });

    return {
      ok: true,
      appointment: {
        id: appointment.id,
        subject: appointment.subject,
        mode: appointment.mode,
        startsAtUtc: appointment.startsAtUtc.toISOString(),
        endsAtUtc: appointment.endsAtUtc.toISOString(),
        scheduledTimeZone: appointment.scheduledTimeZone.ianaName,
        scheduledOffsetMinutes: appointment.scheduledOffsetMinutes
      }
    };
  });
}
