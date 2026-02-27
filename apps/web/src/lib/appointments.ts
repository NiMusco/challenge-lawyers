import { DateTime } from 'luxon';
import type { AppointmentRow, DurationMinutes } from '../types';

export type UtcRangeMs = { startMs: number; endMs: number };

export function rangesOverlap(a: UtcRangeMs, b: UtcRangeMs): boolean {
  // [start, end) overlap
  return a.startMs < b.endMs && a.endMs > b.startMs;
}

export function getUtcRangeFromLocalInput(input: {
  startsAtLocal: string; // "YYYY-MM-DDTHH:mm"
  durationMinutes: DurationMinutes;
  scheduledTimeZone: string; // IANA
}): UtcRangeMs | null {
  const dtLocal = DateTime.fromISO(input.startsAtLocal, { zone: input.scheduledTimeZone });
  if (!dtLocal.isValid) return null;

  const startMs = dtLocal.toUTC().toMillis();
  const endMs = dtLocal.plus({ minutes: input.durationMinutes }).toUTC().toMillis();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return null;
  return { startMs, endMs };
}

export function hasAppointmentOverlap(range: UtcRangeMs, appointments: AppointmentRow[]): boolean {
  for (const a of appointments) {
    const startMs = Date.parse(a.startsAtUtc);
    const endMs = Date.parse(a.endsAtUtc);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) continue;
    if (rangesOverlap(range, { startMs, endMs })) return true;
  }
  return false;
}

