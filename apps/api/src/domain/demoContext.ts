import type { PrismaClient } from '@prisma/client';

export type DemoContext = {
  tzUtc: { id: string; ianaName: string };
  country: { id: string; isoCode: string; name: string };
  office: { id: string; name: string };
};

export type LawyerWithCalendar = {
  base: DemoContext;
  lawyer: { id: string; email: string; fullName: string };
  calendar: { id: string; name: string };
};

export async function getOrCreateDemoBase(prisma: PrismaClient): Promise<DemoContext> {
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

export async function getOrCreateLawyerWithCalendar(
  prisma: PrismaClient,
  input: { email: string; fullName: string }
): Promise<LawyerWithCalendar> {
  const base = await getOrCreateDemoBase(prisma);

  const lawyer = await prisma.lawyer.upsert({
    where: { email: input.email },
    update: { fullName: input.fullName, officeId: base.office.id },
    create: { email: input.email, fullName: input.fullName, officeId: base.office.id }
  });

  const calendarName = `${lawyer.fullName} (personal)`;
  const calendar =
    (await prisma.calendar.findFirst({ where: { ownerLawyerId: lawyer.id, name: calendarName } })) ??
    (await prisma.calendar.create({
      data: { ownerLawyerId: lawyer.id, name: calendarName, timeZoneId: base.tzUtc.id }
    }));

  return { base, lawyer, calendar };
}

export async function createLawyerWithCalendar(
  prisma: PrismaClient,
  input: { email: string; fullName: string }
): Promise<LawyerWithCalendar> {
  const base = await getOrCreateDemoBase(prisma);

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

export async function getOrCreateDemoLawyer(prisma: PrismaClient): Promise<LawyerWithCalendar> {
  return getOrCreateLawyerWithCalendar(prisma, {
    email: 'demo.lawyer@challenge.local',
    fullName: 'Demo Lawyer'
  });
}
