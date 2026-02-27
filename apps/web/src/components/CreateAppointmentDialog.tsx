import { useEffect, useState } from 'react';
import type { AppointmentMode, DurationMinutes } from '../types';
import type { AppointmentRow } from '../types';
import { getFriendlyErrorMessage } from '../lib/friendlyErrorMessage';
import { getUtcRangeFromLocalInput, hasAppointmentOverlap } from '../lib/appointments';
import { AppointmentForm } from './AppointmentForm';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';

export function CreateAppointmentDialog(props: {
  open: boolean;
  onClose: () => void;
  appointments: AppointmentRow[];
  lawyerEmail: string;
  subject: string;
  setSubject: (v: string) => void;
  mode: AppointmentMode;
  setMode: (v: AppointmentMode) => void;
  startsAtLocal: string;
  setStartsAtLocal: (v: string) => void;
  scheduledTimeZone: string;
  durationMinutes: DurationMinutes;
  setDurationMinutes: (v: DurationMinutes) => void;
  createAppointment: () => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const overlapError = (() => {
    if (!props.open) return null;
    const range = getUtcRangeFromLocalInput({
      startsAtLocal: props.startsAtLocal,
      durationMinutes: props.durationMinutes,
      scheduledTimeZone: props.scheduledTimeZone
    });
    if (!range) return null;
    return hasAppointmentOverlap(range, props.appointments) ? 'Ese horario ya está ocupado. Elegí otro.' : null;
  })();

  useEffect(() => {
    if (props.open) {
      setError(null);
      setBusy(false);
    }
  }, [props.open]);

  async function onSubmit() {
    if (overlapError) {
      return;
    }

    setError(null);
    setBusy(true);
    try {
      await props.createAppointment();
      props.onClose();
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={props.open} onOpenChange={(open) => (open ? null : props.onClose())}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Crear cita</DialogTitle>
          <DialogDescription>Seleccioná un horario en la agenda para prellenar inicio y duración.</DialogDescription>
        </DialogHeader>

        <AppointmentForm
          lawyerEmail={props.lawyerEmail}
          subject={props.subject}
          setSubject={props.setSubject}
          mode={props.mode}
          setMode={props.setMode}
          startsAtLocal={props.startsAtLocal}
          setStartsAtLocal={props.setStartsAtLocal}
          scheduledTimeZone={props.scheduledTimeZone}
          durationMinutes={props.durationMinutes}
          setDurationMinutes={props.setDurationMinutes}
          busy={busy}
          error={error ?? overlapError}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}

