import 'dotenv/config';
import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';
import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const app = Fastify({ logger: true });

function ensureLocalDatabaseUrl() {
  if (process.env.DATABASE_URL) return;

  // Default: local SQLite file, no env setup required.
  const dbFile = path.resolve(process.cwd(), '../../.data/dev.db');
  process.env.DATABASE_URL = `file:${dbFile}`;
  process.env.AUTO_DB_PUSH = '1';
}

ensureLocalDatabaseUrl();

const prisma = new PrismaClient();

app.get('/health', async () => {
  return { ok: true };
});

app.get('/db', async () => {
  const timeZones = await prisma.timeZone.count();
  return { ok: true, timeZones };
});

type DemoContext = {
  tzUtc: { id: string; ianaName: string };
  country: { id: string; isoCode: string; name: string };
  office: { id: string; name: string };
};

async function ensureBaseDemoContext(): Promise<DemoContext> {
  const tzUtc = await prisma.timeZone.upsert({
    where: { ianaName: 'UTC' },
    update: {},
    create: { ianaName: 'UTC' }
  });

  const country = await prisma.country.upsert({
    where: { isoCode: 'AR' },
    update: { name: 'Argentina', defaultTimeZoneId: tzUtc.id },
    create: { isoCode: 'AR', name: 'Argentina', defaultTimeZoneId: tzUtc.id }
  });

  const office =
    (await prisma.office.findFirst({ where: { name: 'Demo Office', countryId: country.id } })) ??
    (await prisma.office.create({
      data: { name: 'Demo Office', countryId: country.id, timeZoneId: tzUtc.id }
    }));

  return { tzUtc, country, office };
}

async function ensureLawyerWithOwnCalendar(input: { email: string; fullName: string }) {
  const base = await ensureBaseDemoContext();

  const lawyer = await prisma.lawyer.upsert({
    where: { email: input.email },
    update: { fullName: input.fullName, officeId: base.office.id },
    create: { email: input.email, fullName: input.fullName, officeId: base.office.id }
  });

  // "Calendario propio": un Calendar cuyo owner es el Lawyer.
  const calendarName = `${lawyer.fullName} (personal)`;
  const calendar =
    (await prisma.calendar.findFirst({ where: { ownerLawyerId: lawyer.id, name: calendarName } })) ??
    (await prisma.calendar.create({
      data: { ownerLawyerId: lawyer.id, name: calendarName, timeZoneId: base.tzUtc.id }
    }));

  return { base, lawyer, calendar };
}

async function createLawyerWithOwnCalendar(input: { email: string; fullName: string }) {
  const base = await ensureBaseDemoContext();

  return await prisma.$transaction(async (tx) => {
    const lawyer = await tx.lawyer.create({
      data: { email: input.email, fullName: input.fullName, officeId: base.office.id }
    });

    const calendarName = `${lawyer.fullName} (personal)`;
    const calendar = await tx.calendar.create({
      data: { ownerLawyerId: lawyer.id, name: calendarName, timeZoneId: base.tzUtc.id }
    });

    return { base, lawyer, calendar };
  });
}

async function fileExists(p: string) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

function execFileAsync(cmd: string, args: string[]) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    execFile(cmd, args, { env: process.env }, (err, stdout, stderr) => {
      if (err) return reject(Object.assign(err, { stdout, stderr }));
      resolve({ stdout: String(stdout ?? ''), stderr: String(stderr ?? '') });
    });
  });
}

async function maybeAutoDbPush() {
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
    app.log.warn({ schemaFromRoot, schemaFromApi }, 'AUTO_DB_PUSH enabled but schema not found');
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
    app.log.warn({ prismaBinFromRoot, prismaBinFromApi }, 'AUTO_DB_PUSH enabled but prisma binary not found');
    return;
  }

  try {
    app.log.info({ schemaPath }, 'AUTO_DB_PUSH: applying schema (prisma db push)');
    await execFileAsync(prismaBin, ['db', 'push', '--schema', schemaPath, '--accept-data-loss', '--skip-generate']);
    app.log.info('AUTO_DB_PUSH: schema applied');
  } catch (e) {
    app.log.error({ err: e }, 'AUTO_DB_PUSH failed');
  }
}

async function bootstrapDemo() {
  return await ensureLawyerWithOwnCalendar({
    email: 'demo.lawyer@challenge.local',
    fullName: 'Demo Lawyer'
  });
}

app.post('/api/bootstrap', async () => {
  const ctx = await bootstrapDemo();
  return {
    ok: true,
    ids: {
      timeZoneId: ctx.base.tzUtc.id,
      countryId: ctx.base.country.id,
      officeId: ctx.base.office.id,
      lawyerId: ctx.lawyer.id,
      calendarId: ctx.calendar.id
    }
  };
});

app.get('/api/lawyers', async () => {
  await bootstrapDemo();

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
    const ctx = await createLawyerWithOwnCalendar({ email, fullName });
    return {
      ok: true,
      lawyer: { id: ctx.lawyer.id, email: ctx.lawyer.email, fullName: ctx.lawyer.fullName },
      calendar: { id: ctx.calendar.id, name: ctx.calendar.name }
    };
  } catch (e: any) {
    // Prisma unique constraint on Lawyer.email
    if (e?.code === 'P2002') {
      return reply.code(409).send({ ok: false, error: 'lawyer already registered with that email' });
    }
    throw e;
  }
});

app.get('/api/appointments', async (req) => {
  const q = (req.query ?? {}) as Partial<{ lawyerEmail: string }>;
  const lawyerEmail = (q.lawyerEmail ?? 'demo.lawyer@challenge.local').trim().toLowerCase();

  const ctx =
    lawyerEmail === 'demo.lawyer@challenge.local'
      ? await bootstrapDemo()
      : await ensureLawyerWithOwnCalendar({ email: lawyerEmail, fullName: 'New Lawyer' });

  const items = await prisma.appointment.findMany({
    where: { calendarId: ctx.calendar.id },
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
    startsAtLocal: string; // "YYYY-MM-DDTHH:mm"
    durationMinutes: number;
    scheduledTimeZone: string; // IANA
    lawyerEmail: string;
  }>;

  const allowedDurations = new Set([15, 30, 45, 60, 90, 120]);

  const subject = (body.subject ?? '').trim();
  const mode = body.mode ?? 'VIDEO_CALL';
  const startsAtLocal = body.startsAtLocal ?? '';
  const durationMinutes = body.durationMinutes ?? 30;
  const scheduledTimeZone = (body.scheduledTimeZone ?? 'UTC').trim();
  const lawyerEmail = (body.lawyerEmail ?? 'demo.lawyer@challenge.local').trim().toLowerCase();

  if (!subject) return reply.code(400).send({ ok: false, error: 'subject is required' });
  if (!startsAtLocal) return reply.code(400).send({ ok: false, error: 'startsAtLocal is required' });
  if (!Number.isFinite(durationMinutes) || !allowedDurations.has(durationMinutes)) {
    return reply
      .code(400)
      .send({ ok: false, error: `durationMinutes must be one of: ${Array.from(allowedDurations).join(', ')}` });
  }

  const dtLocal = DateTime.fromISO(startsAtLocal, { zone: scheduledTimeZone });
  if (!dtLocal.isValid) {
    return reply.code(400).send({ ok: false, error: `invalid startsAtLocal or scheduledTimeZone: ${dtLocal.invalidReason ?? 'unknown'}` });
  }

  const dtEndLocal = dtLocal.plus({ minutes: durationMinutes });
  const startsAtUtc = dtLocal.toUTC().toJSDate();
  const endsAtUtc = dtEndLocal.toUTC().toJSDate();

  const ctx =
    lawyerEmail === 'demo.lawyer@challenge.local'
      ? await bootstrapDemo()
      : await ensureLawyerWithOwnCalendar({ email: lawyerEmail, fullName: 'New Lawyer' });

  const tz = await prisma.timeZone.upsert({
    where: { ianaName: scheduledTimeZone },
    update: {},
    create: { ianaName: scheduledTimeZone }
  });

  const appt = await prisma.appointment.create({
    data: {
      calendarId: ctx.calendar.id,
      createdByLawyerId: ctx.lawyer.id,
      mode,
      subject,
      startsAtUtc,
      endsAtUtc,
      scheduledTimeZoneId: tz.id,
      scheduledOffsetMinutes: dtLocal.offset,
      startsAtLocal: dtLocal.toJSDate(),
      endsAtLocal: dtEndLocal.toJSDate(),
      lawyers: {
        create: [{ lawyerId: ctx.lawyer.id, role: 'ORGANIZER' }]
      }
    },
    include: { scheduledTimeZone: true }
  });

  return {
    ok: true,
    appointment: {
      id: appt.id,
      subject: appt.subject,
      mode: appt.mode,
      startsAtUtc: appt.startsAtUtc.toISOString(),
      endsAtUtc: appt.endsAtUtc.toISOString(),
      scheduledTimeZone: appt.scheduledTimeZone.ianaName,
      scheduledOffsetMinutes: appt.scheduledOffsetMinutes
    }
  };
});

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

await maybeAutoDbPush();
await app.listen({ port, host });

