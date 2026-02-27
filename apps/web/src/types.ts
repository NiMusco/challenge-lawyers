export type AppointmentMode = 'IN_PERSON' | 'VIDEO_CALL' | 'PHONE_CALL';

export type AppointmentRow = {
  id: string;
  subject: string;
  mode: AppointmentMode;
  startsAtUtc: string;
  endsAtUtc: string;
  scheduledTimeZone: string;
  scheduledOffsetMinutes: number;
};

export type LawyerRow = {
  id: string;
  email: string;
  fullName: string;
  personalCalendar: { id: string; name: string } | null;
};

export const allowedDurations = [15, 30, 45, 60, 90, 120] as const;
export type DurationMinutes = (typeof allowedDurations)[number];

