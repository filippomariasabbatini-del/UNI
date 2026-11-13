import type { WeekHours, Weekday } from '../config/constants';
import { format } from '../lib/format';
import { localMoment, studioStatus } from '../lib/studio-hours';
import { intlLocale, readJson } from './dom';

interface Labels {
  status: {
    open: string;
    closedTomorrow: string;
    closedLaterToday: string;
    closedUntilDay: string;
    fallback: string;
  };
  weekdays: Record<Weekday, string>;
}

function statusText(
  week: WeekHours,
  timeZone: string,
  now: Date,
  labels: Labels,
): [string, boolean] {
  const status = studioStatus(week, localMoment(now, timeZone));
  if (status.state === 'open') return [format(labels.status.open, { time: status.closesAt }), true];
  if (status.state === 'unknown') return [labels.status.fallback, false];
  if (status.reopens === 'tomorrow') return [labels.status.closedTomorrow, false];
  if (status.reopens === 'later-today') {
    return [format(labels.status.closedLaterToday, { time: status.at }), false];
  }
  return [format(labels.status.closedUntilDay, { day: labels.weekdays[status.weekday] }), false];
}

/** Ora locale e stato aperto/chiuso di ogni studio, aggiornati ogni 30 secondi. */
export function initStudioClocks(): void {
  const list = document.querySelector<HTMLElement>('[data-studio-labels]');
  const labels = list ? readJson<Labels>(list, 'studioLabels') : null;
  if (!list || !labels) return;

  const clocks = [...list.querySelectorAll<HTMLElement>('[data-studio-clock]')].flatMap((clock) => {
    const timeZone = clock.dataset['timeZone'];
    const week = readJson<WeekHours>(clock, 'week');
    const time = clock.querySelector<HTMLTimeElement>('[data-studio-time]');
    const status = clock.querySelector<HTMLElement>('[data-studio-status]');
    const dot = clock.querySelector<HTMLElement>('[data-studio-dot]');
    if (!timeZone || !week || !time || !status || !dot) return [];
    const formatter = new Intl.DateTimeFormat(intlLocale(), {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
    });
    return [{ clock, timeZone, week, time, status, dot, formatter }];
  });

  const render = (): void => {
    const now = new Date();
    for (const { clock, timeZone, week, time, status, dot, formatter } of clocks) {
      try {
        const [text, open] = statusText(week, timeZone, now, labels);
        time.textContent = formatter.format(now);
        time.dateTime = now.toISOString();
        status.textContent = text;
        dot.toggleAttribute('data-open', open);
        clock.hidden = false;
      } catch {
        clock.hidden = true;
      }
    }
  };

  render();
  window.setInterval(render, 30_000);
}
