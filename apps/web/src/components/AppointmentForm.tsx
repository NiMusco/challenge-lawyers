import { useMemo } from 'react';
import type { AppointmentMode, DurationMinutes } from '../types';
import { allowedDurations } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

export function AppointmentForm(props: {
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
  busy: boolean;
  error: string | null;
  onSubmit: () => Promise<void>;
}) {
  const exampleCurl = useMemo(() => {
    return `curl -X POST http://127.0.0.1:3000/api/appointments \\
  -H 'content-type: application/json' \\
  -d '${JSON.stringify(
    {
      lawyerEmail: props.lawyerEmail,
      subject: props.subject,
      mode: props.mode,
      startsAtLocal: props.startsAtLocal,
      durationMinutes: props.durationMinutes,
      scheduledTimeZone: props.scheduledTimeZone
    },
    null,
    0
  ).replace(/'/g, "'\\''")}'`;
  }, [
    props.durationMinutes,
    props.lawyerEmail,
    props.mode,
    props.scheduledTimeZone,
    props.startsAtLocal,
    props.subject
  ]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void props.onSubmit();
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium">Asunto</label>
          <Input value={props.subject} onChange={(e) => props.setSubject(e.target.value)} autoFocus disabled={props.busy} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Modo</label>
            <Select value={props.mode} onValueChange={(v) => props.setMode(v as AppointmentMode)} disabled={props.busy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IN_PERSON">Presencial</SelectItem>
                <SelectItem value="VIDEO_CALL">Videollamada</SelectItem>
                <SelectItem value="PHONE_CALL">Telefónica</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Duración (min)</label>
            <Select
              value={String(props.durationMinutes)}
              onValueChange={(v) => props.setDurationMinutes(Number(v) as DurationMinutes)}
              disabled={props.busy}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allowedDurations.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Inicio</label>
            <Input
              type="datetime-local"
              value={props.startsAtLocal}
              onChange={(e) => props.setStartsAtLocal(e.target.value)}
              disabled={props.busy}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Zona horaria</label>
            <Input
              value={props.scheduledTimeZone}
              placeholder="America/Argentina/Buenos_Aires"
              disabled
              readOnly
            />
          </div>
        </div>

        {props.error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {props.error}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2">
          <Button type="submit" disabled={props.busy}>
            {props.busy ? 'Creando…' : 'Crear'}
          </Button>
        </div>
      </form>

      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-muted-foreground">see curl</summary>
        <div className="mt-2 max-h-56 w-full overflow-auto rounded-md border bg-muted">
          <pre className="w-full whitespace-pre-wrap break-all p-3 text-xs">
            {exampleCurl}
          </pre>
        </div>
      </details>
    </div>
  );
}

