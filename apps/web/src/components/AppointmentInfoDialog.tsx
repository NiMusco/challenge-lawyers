import type { AppointmentRow } from '../types';
import { Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';

function fmtLocal(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

function durationMinutes(a: AppointmentRow): number | null {
  const startMs = Date.parse(a.startsAtUtc);
  const endMs = Date.parse(a.endsAtUtc);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return null;
  return Math.round((endMs - startMs) / 60_000);
}

function modeLabel(mode: AppointmentRow['mode']) {
  switch (mode) {
    case 'IN_PERSON':
      return 'Presencial';
    case 'VIDEO_CALL':
      return 'Videollamada';
    case 'PHONE_CALL':
      return 'Telefónica';
  }
}

export function AppointmentInfoDialog(props: { open: boolean; onClose: () => void; appointment: AppointmentRow | null }) {
  const a = props.appointment;
  const mins = a ? durationMinutes(a) : null;

  return (
    <Dialog open={props.open} onOpenChange={(open) => (open ? null : props.onClose())}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalle de la cita</DialogTitle>
          <DialogDescription>Información del turno seleccionado.</DialogDescription>
        </DialogHeader>

        {!a ? (
          <div className="text-sm text-muted-foreground">No hay cita seleccionada.</div>
        ) : (
          <div className="grid gap-3 text-sm">
            <div className="rounded-md border bg-muted/30 px-3 py-2">
              <div className="text-xs text-muted-foreground">Asunto</div>
              <div className="font-semibold">{a.subject}</div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-md border bg-muted/30 px-3 py-2">
                <div className="text-xs text-muted-foreground">Modo</div>
                <div className="font-medium">{modeLabel(a.mode)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border bg-muted/30 px-3 py-2">
                <div className="text-xs text-muted-foreground">Zona horaria</div>
                <div className="font-medium">{a.scheduledTimeZone}</div>
              </div>

              <div className="rounded-md border bg-muted/30 px-3 py-2">
                <div className="text-xs text-muted-foreground">Fecha y hora</div>
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span>{fmtLocal(a.startsAtUtc)}</span>
                  {mins != null ? (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{mins} min</span>
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

