import type { PrismaClient } from '@prisma/client';
import {
  getOrCreateLawyerWithCalendar,
  createLawyerWithCalendar,
  getOrCreateDemoLawyer
} from './demoContext.js';

function createMockPrisma(overrides: Partial<Record<string, jest.Mock>> = {}) {
  const tzUtc = { id: 'tz-1', ianaName: 'UTC' };
  const country = { id: 'country-1', isoCode: 'AR', name: 'Argentina' };
  const office = { id: 'office-1', name: 'Demo Office' };
  const lawyer = { id: 'lawyer-1', email: 'test@test.com', fullName: 'Test Lawyer' };
  const calendar = { id: 'cal-1', name: 'Test Lawyer (personal)' };

  const timeZone = {
    upsert: jest.fn().mockResolvedValue(tzUtc)
  };
  const countryDelegate = {
    upsert: jest.fn().mockResolvedValue(country)
  };
  const officeDelegate = {
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue(office)
  };
  const lawyerDelegate = {
    upsert: jest.fn().mockResolvedValue(lawyer),
    create: jest.fn().mockResolvedValue(lawyer)
  };
  const calendarDelegate = {
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue(calendar)
  };

  const tx = {
    lawyer: { create: lawyerDelegate.create },
    calendar: { create: calendarDelegate.create }
  };
  const prisma = {
    timeZone,
    country: countryDelegate,
    office: officeDelegate,
    lawyer: lawyerDelegate,
    calendar: calendarDelegate,
    $transaction: jest.fn((fn: (t: typeof tx) => Promise<unknown>) => fn(tx))
  };

  return { prisma: prisma as unknown as PrismaClient, tzUtc, country, office, lawyer, calendar, tx };
}

describe('getOrCreateLawyerWithCalendar', () => {
  it('returns flat shape with tzUtc, country, office, lawyer and calendar', async () => {
    const { prisma, tzUtc, country, office, lawyer, calendar } = createMockPrisma();
    const result = await getOrCreateLawyerWithCalendar(prisma, {
      email: 'lawyer@example.com',
      fullName: 'Jane Doe'
    });
    expect(result.tzUtc).toEqual(tzUtc);
    expect(result.country).toEqual(country);
    expect(result.office).toEqual(office);
    expect(result.lawyer).toEqual(lawyer);
    expect(result.calendar).toEqual(calendar);
    expect(result.calendar.name).toContain('personal');
  });

  it('calls lawyer upsert and calendar findFirst/create', async () => {
    const { prisma } = createMockPrisma();
    await getOrCreateLawyerWithCalendar(prisma, { email: 'a@b.com', fullName: 'A B' });
    expect(prisma.lawyer.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: 'a@b.com' },
        create: expect.objectContaining({ email: 'a@b.com', fullName: 'A B' })
      })
    );
  });
});

describe('createLawyerWithCalendar', () => {
  it('runs lawyer and calendar creation in transaction', async () => {
    const { prisma, lawyer, calendar } = createMockPrisma();
    const result = await createLawyerWithCalendar(prisma, {
      email: 'new@example.com',
      fullName: 'New User'
    });
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(result.lawyer).toEqual(lawyer);
    expect(result.calendar).toEqual(calendar);
  });

  it('uses transaction callback with create calls', async () => {
    const { prisma, tx } = createMockPrisma();
    await createLawyerWithCalendar(prisma, { email: 'x@y.com', fullName: 'X Y' });
    const cb = (prisma.$transaction as jest.Mock).mock.calls[0][0];
    await cb(tx);
    expect(tx.lawyer.create).toHaveBeenCalled();
    expect(tx.calendar.create).toHaveBeenCalled();
  });
});

describe('getOrCreateDemoLawyer', () => {
  it('calls getOrCreateLawyerWithCalendar with demo email and name', async () => {
    const { prisma } = createMockPrisma();
    await getOrCreateDemoLawyer(prisma);
    expect(prisma.lawyer.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: 'demo.lawyer@challenge.local' },
        create: expect.objectContaining({ fullName: 'Demo Lawyer' })
      })
    );
  });
});
