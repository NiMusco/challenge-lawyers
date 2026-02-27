import type { AppointmentRow } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export function AppointmentsList(props: { appointments: AppointmentRow[] }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Citas</CardTitle>
      </CardHeader>

      <CardContent>
        {props.appointments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay citas creadas.</p>
        ) : (
          <div className="grid gap-3">
            {props.appointments.map((a) => (
              <div key={a.id} className="rounded-lg border bg-muted/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold">{a.subject}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      UTC: {a.startsAtUtc} → {a.endsAtUtc}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      scheduled: {a.scheduledTimeZone} (offset {a.scheduledOffsetMinutes} min)
                    </div>
                  </div>
                  <div className="shrink-0 rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground">
                    {a.mode}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

