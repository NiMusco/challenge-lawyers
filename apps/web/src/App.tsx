import { useEffect, useState } from 'react';
import { api } from './api';
import { DateTime } from 'luxon';
import { AppHeader } from './components/AppHeader';
import { AppointmentInfoDialog } from './components/AppointmentInfoDialog';
import { AppointmentsCalendar } from './components/AppointmentsCalendar';
import { CreateAppointmentDialog } from './components/CreateAppointmentDialog';
import { CreateLawyerDialog } from './components/CreateLawyerDialog';
import { Layout } from './components/Layout';
import { allowedDurations, type AppointmentMode, type AppointmentRow, type DurationMinutes, type LawyerRow } from './types';

export function App() {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [lawyers, setLawyers] = useState<LawyerRow[]>([]);
  const [lawyerEmail, setLawyerEmail] = useState<string>('demo.lawyer@challenge.local');
  const [createLawyerOpen, setCreateLawyerOpen] = useState(false);
  const [createAppointmentOpen, setCreateAppointmentOpen] = useState(false);
  const [appointmentInfoOpen, setAppointmentInfoOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);

  const [subject, setSubject] = useState('Consulta inicial');
  const [mode, setMode] = useState<AppointmentMode>('VIDEO_CALL');
  const [startsAtLocal, setStartsAtLocal] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 15);
    d.setSeconds(0, 0);
    // datetime-local expects "YYYY-MM-DDTHH:mm"
    return d.toISOString().slice(0, 16);
  });
  const [durationMinutes, setDurationMinutes] = useState<DurationMinutes>(allowedDurations[1]);
  const [scheduledTimeZone] = useState(() => {
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!browserTz) return 'UTC';
    const dt = DateTime.now().setZone(browserTz);
    return dt.isValid ? browserTz : 'UTC';
  });

  async function refresh() {
    const rows = await api<{ items: AppointmentRow[] }>(
      `/api/appointments?lawyerEmail=${encodeURIComponent(lawyerEmail)}`
    );
    setAppointments(rows.items);
  }

  async function refreshLawyers() {
    const rows = await api<{ items: LawyerRow[] }>('/api/lawyers');
    setLawyers(rows.items);
    if (!rows.items.some((l) => l.email === lawyerEmail) && rows.items[0]) {
      setLawyerEmail(rows.items[0].email);
    }
  }

  useEffect(() => {
    (async () => {
      await api('/api/bootstrap', { method: 'POST', body: JSON.stringify({}) });
      await refreshLawyers();
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await refresh();
      } catch {
        // ignore while switching lawyers during startup
      }
    })();
  }, [lawyerEmail]);

  async function createAppointment() {
    await api('/api/appointments', {
      method: 'POST',
      body: JSON.stringify({ lawyerEmail, subject, mode, startsAtLocal, durationMinutes, scheduledTimeZone })
    });
    await refresh();
  }

  async function createLawyer(input: { email: string; fullName: string }) {
    await api('/api/lawyers', {
      method: 'POST',
      body: JSON.stringify({ email: input.email, fullName: input.fullName })
    });
    await refreshLawyers();
  }

  const selectedAppointment = selectedAppointmentId
    ? appointments.find((a) => a.id === selectedAppointmentId) ?? null
    : null;

  return (
    <Layout
      header={
        <AppHeader
          title="Challenge Lawyers Demo"
          lawyers={lawyers}
          lawyerEmail={lawyerEmail}
          onChangeLawyerEmail={setLawyerEmail}
          onOpenCreateLawyer={() => setCreateLawyerOpen(true)}
        />
      }
    >
      <CreateLawyerDialog
        open={createLawyerOpen}
        onClose={() => setCreateLawyerOpen(false)}
        createLawyer={createLawyer}
        onCreated={(email) => setLawyerEmail(email)}
      />

      <AppointmentInfoDialog
        open={appointmentInfoOpen}
        onClose={() => setAppointmentInfoOpen(false)}
        appointment={selectedAppointment}
      />

      <CreateAppointmentDialog
        open={createAppointmentOpen}
        onClose={() => setCreateAppointmentOpen(false)}
        appointments={appointments}
        lawyerEmail={lawyerEmail}
        subject={subject}
        setSubject={setSubject}
        mode={mode}
        setMode={setMode}
        startsAtLocal={startsAtLocal}
        setStartsAtLocal={setStartsAtLocal}
        scheduledTimeZone={scheduledTimeZone}
        durationMinutes={durationMinutes}
        setDurationMinutes={setDurationMinutes}
        createAppointment={createAppointment}
      />

      <div className="flex-1">
        <AppointmentsCalendar
          appointments={appointments}
          defaultDurationMinutes={durationMinutes}
          onOpenAppointmentInfo={(id) => {
            setSelectedAppointmentId(id);
            setAppointmentInfoOpen(true);
          }}
          onPickSlot={(slot) => {
            setStartsAtLocal(slot.startsAtLocal);
            setDurationMinutes(slot.durationMinutes);
            setCreateAppointmentOpen(true);
          }}
        />
      </div>
    </Layout>
  );
}

