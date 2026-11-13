import { WEEKDAYS, type WeekHours, type Weekday } from '../config/constants';

export interface LocalMoment {
  weekday: Weekday;
  /** Minuti trascorsi dalla mezzanotte locale */
  minutes: number;
}

export type StudioStatus =
  | { state: 'open'; closesAt: string }
  | { state: 'closed'; reopens: 'later-today' | 'tomorrow' | 'later'; weekday: Weekday; at: string }
  | { state: 'unknown' };

const WEEKDAY_BY_EN: Record<string, Weekday> = {
  Mon: 'mon',
  Tue: 'tue',
  Wed: 'wed',
  Thu: 'thu',
  Fri: 'fri',
  Sat: 'sat',
  Sun: 'sun',
};

export function toMinutes(time: string): number {
  const [hours = '0', minutes = '0'] = time.split(':');
  return Number(hours) * 60 + Number(minutes);
}

/** Giorno della settimana e ora locale di `date` nel fuso `timeZone` (IANA). */
export function localMoment(date: Date, timeZone: string): LocalMoment {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';
  const weekday = WEEKDAY_BY_EN[read('weekday')];
  if (!weekday) throw new Error(`Giorno non riconosciuto per il fuso ${timeZone}`);
  return { weekday, minutes: Number(read('hour')) * 60 + Number(read('minute')) };
}

/** Stato di apertura dato l'orario settimanale e il momento locale. Funzione pura. */
export function studioStatus(week: WeekHours, moment: LocalMoment): StudioStatus {
  const today = week[moment.weekday];
  if (today) {
    const [opens, closes] = today;
    if (moment.minutes >= toMinutes(opens) && moment.minutes < toMinutes(closes)) {
      return { state: 'open', closesAt: closes };
    }
    if (moment.minutes < toMinutes(opens)) {
      return { state: 'closed', reopens: 'later-today', weekday: moment.weekday, at: opens };
    }
  }
  const todayIndex = WEEKDAYS.indexOf(moment.weekday);
  for (let offset = 1; offset <= 7; offset += 1) {
    const weekday = WEEKDAYS[(todayIndex + offset) % 7];
    const hours = weekday ? week[weekday] : null;
    if (weekday && hours) {
      return {
        state: 'closed',
        reopens: offset === 1 ? 'tomorrow' : 'later',
        weekday,
        at: hours[0],
      };
    }
  }
  return { state: 'unknown' };
}
