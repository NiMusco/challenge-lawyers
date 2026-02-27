import { useEffect, useMemo, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import type { CalendarApi, DateSelectArg, EventClickArg, EventInput } from '@fullcalendar/core';
import type { DateClickArg } from '@fullcalendar/interaction';
import type { AppointmentRow, DurationMinutes } from '../types';
import { allowedDurations } from '../types';
import { rangesOverlap } from '../lib/appointments';
import { Card, CardContent } from './ui/card';

function toDatetimeLocalValue(d: Date): string {
  const tzOffsetMs = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

function closestAllowedDurationMinutes(minutes: number): DurationMinutes {
  let best: DurationMinutes = allowedDurations[0];
  let bestDist = Number.POSITIVE_INFINITY;
  for (const m of allowedDurations) {
    const dist = Math.abs(m - minutes);
    if (dist < bestDist) {
      best = m;
      bestDist = dist;
    }
  }
  return best;
}

const HEADER_HEIGHT_PX = 73;

export function AppointmentsCalendar(props: {
  appointments: AppointmentRow[];
  onPickSlot: (slot: { startsAtLocal: string; durationMinutes: DurationMinutes }) => void;
  defaultDurationMinutes?: DurationMinutes;
  onOpenAppointmentInfo?: (appointmentId: string) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const calendarRef = useRef<any>(null);
  const [hoverRect, setHoverRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  const events: EventInput[] = useMemo(
    () =>
      props.appointments.map((a) => ({
        id: a.id,
        title: a.subject,
        start: a.startsAtUtc,
        end: a.endsAtUtc
      })),
    [props.appointments]
  );

  useEffect(() => {
    const root = wrapperRef.current;
    if (!root) return;
    const rootEl = root;

    function clear() {
      setHoverRect(null);
    }

    function onMouseMove(e: MouseEvent) {
      // FullCalendar's interaction layer isn't necessarily inside the slats <td>,
      // so we compute the hovered lane/column by geometry instead of relying on event.target.
      const lanes = Array.from(rootEl.querySelectorAll<HTMLTableCellElement>('td.fc-timegrid-slot-lane'));
      if (lanes.length === 0) return clear();

      const lane = lanes.find((td) => {
        const r = td.getBoundingClientRect();
        return e.clientY >= r.top && e.clientY < r.bottom;
      });
      if (!lane) return clear();

      const cols = Array.from(rootEl.querySelectorAll<HTMLElement>('.fc-timegrid-col'));
      if (cols.length === 0) return clear();

      const col = cols.find((c) => {
        const r = c.getBoundingClientRect();
        return e.clientX >= r.left && e.clientX < r.right;
      });
      if (!col) return clear();

      const colDate = col.getAttribute('data-date');
      const laneTime = lane.getAttribute('data-time');
      if (colDate && laneTime) {
        const [yStr, mStr, dStr] = colDate.split('-');
        const [hhStr, mmStr, ssStr] = laneTime.split(':');
        const y = Number(yStr);
        const m = Number(mStr);
        const d = Number(dStr);
        const hh = Number(hhStr);
        const mm = Number(mmStr);
        const ss = Number(ssStr ?? '0');
        const start = new Date(y, m - 1, d, hh, mm, ss, 0);
        const startMs = start.getTime();
        const endMs = startMs + 15 * 60_000;

        if (Number.isFinite(startMs) && Number.isFinite(endMs)) {
          for (const a of props.appointments) {
            const aStartMs = Date.parse(a.startsAtUtc);
            const aEndMs = Date.parse(a.endsAtUtc);
            if (!Number.isFinite(aStartMs) || !Number.isFinite(aEndMs)) continue;
            if (rangesOverlap({ startMs, endMs }, { startMs: aStartMs, endMs: aEndMs })) return clear();
          }

          // Fallback: if the calendar API is available, it should match the same behavior.
          const api = (calendarRef.current?.getApi?.() as CalendarApi | undefined) ?? undefined;
          const events = api?.getEvents?.() ?? [];
          for (const ev of events) {
            const evStartMs = ev.start ? ev.start.getTime() : NaN;
            const evEndMs = ev.end ? ev.end.getTime() : NaN;
            if (!Number.isFinite(evStartMs) || !Number.isFinite(evEndMs)) continue;
            if (rangesOverlap({ startMs, endMs }, { startMs: evStartMs, endMs: evEndMs })) return clear();
          }
        }
      }

      const rootRect = rootEl.getBoundingClientRect();
      const laneRect = lane.getBoundingClientRect();
      const colRect = col.getBoundingClientRect();

      // Skip the time-axis column (it can match .fc-timegrid-col too).
      if (colRect.right <= laneRect.left + 1) return clear();

      setHoverRect({
        left: Math.round(colRect.left - rootRect.left),
        top: Math.round(laneRect.top - rootRect.top),
        width: Math.round(colRect.width),
        height: Math.round(laneRect.height)
      });
    }

    rootEl.addEventListener('mousemove', onMouseMove);
    rootEl.addEventListener('mouseover', onMouseMove);
    rootEl.addEventListener('mouseleave', clear);

    return () => {
      rootEl.removeEventListener('mousemove', onMouseMove);
      rootEl.removeEventListener('mouseover', onMouseMove);
      rootEl.removeEventListener('mouseleave', clear);
    };
  }, [props.appointments]);

  function onSelect(arg: DateSelectArg) {
    const start = arg.start;
    const end = arg.end;
    const minutes = Math.max(15, Math.round((end.getTime() - start.getTime()) / 60_000));

    props.onPickSlot({
      startsAtLocal: toDatetimeLocalValue(start),
      durationMinutes: closestAllowedDurationMinutes(minutes)
    });

    arg.view.calendar.unselect();
  }

  function onDateClick(arg: DateClickArg) {
    if (arg.allDay) return;
    props.onPickSlot({
      startsAtLocal: toDatetimeLocalValue(arg.date),
      durationMinutes: props.defaultDurationMinutes ?? allowedDurations[1]
    });
  }

  function onEventClick(arg: EventClickArg) {
    arg.jsEvent.preventDefault();
    props.onOpenAppointmentInfo?.(String(arg.event.id));
  }

  return (
    <Card className="h-full w-full rounded-none border-0 shadow-none">
      <CardContent className="h-full w-full p-0">
        <div
          ref={wrapperRef}
          className="appointments-calendar relative flex rounded-none border-t bg-background p-2"
          style={{ height: `calc(100vh - ${HEADER_HEIGHT_PX}px)`, width: '100%' }}
        >
          {hoverRect ? (
            <div
              aria-hidden="true"
              data-hover-cell="true"
              className="pointer-events-none absolute rounded-sm"
              style={{
                left: hoverRect.left,
                top: hoverRect.top,
                width: hoverRect.width,
                height: hoverRect.height
              }}
            />
          ) : null}
          <FullCalendar
            ref={calendarRef}
            plugins={[timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'timeGridDay,timeGridWeek'
            }}
            nowIndicator
            selectable
            selectMirror
            select={onSelect}
            dateClick={onDateClick}
            events={events}
            eventClick={onEventClick}
            allDaySlot={false}
            slotDuration="00:15:00"
            slotLabelInterval="01:00"
            slotMinTime="08:00:00"
            slotMaxTime="20:00:00"
            expandRows
            height="100%"
            eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

