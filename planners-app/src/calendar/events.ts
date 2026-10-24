/* Everything that ends up written in a calendar day cell. A port of the
   data half of Planners/calendar_print.py and astro_events.py. */
import { addDays, dateKey, inMonths, type YearMonth } from './dates';
import {
    AALBORG_MONTHLY_TEMPS, CALENDAR_COLORS, ECLIPSES, METEOR_SHOWERS,
    MUNICIPALITY_DEADLINES, NOTABLE_EVENTS, SOLSTICES_EQUINOXES, SUPERMOONS,
} from './data';

export type DateMap = Map<string, string>;
export type RGB = [number, number, number];
/** One synced-calendar entry on a day: [prefix letter, text, colour, calendar name]. */
export type CalEvent = [prefix: string, text: string, color: RGB, calendar: string];

const LOCAL_TZ = 'Europe/Copenhagen';

const yearsOf = (months: YearMonth[]) => [...new Set(months.map(([y]) => y))];

function filtered(entries: Iterable<[string, string]>, months: YearMonth[]): DateMap {
    const out: DateMap = new Map();
    for (const [k, v] of entries) if (inMonths(k, months)) out.set(k, v);
    return out;
}

/* --- Holidays --------------------------------------------------------- */

function easter(year: number): [number, number] {
    const a = year % 19;
    const b = Math.floor(year / 100), c = year % 100;
    const d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const n = h + l - 7 * m + 114;
    return [Math.floor(n / 31), (n % 31) + 1];
}

function danishHolidays(year: number): [string, string][] {
    const [em, ed] = easter(year);
    const rel = (days: number) => addDays(year, em, ed, days);
    return [
        [dateKey(year, 1, 1), 'Nytårsdag'],
        [dateKey(year, 6, 5), 'Grundlovsdag'],
        [dateKey(year, 12, 24), 'Juleaften'],
        [dateKey(year, 12, 25), 'Juledag'],
        [dateKey(year, 12, 26), '2. Juledag'],
        [rel(-3), 'Skærtorsdag'],
        [rel(-2), 'Langfredag'],
        [rel(0), 'Påskedag'],
        [rel(1), '2. Påskedag'],
        [rel(39), 'Kr. Himmelfart'],
        [rel(49), 'Pinsedag'],
        [rel(50), '2. Pinsedag'],
    ];
}

export const holidaysFor = (months: YearMonth[]) => filtered(yearsOf(months).flatMap(danishHolidays), months);

export const deadlinesFor = (months: YearMonth[]) => filtered(
    yearsOf(months).flatMap(y => MUNICIPALITY_DEADLINES.map(([m, d, t]) => [dateKey(y, m, d), t] as [string, string])),
    months);

/* --- Temperature ------------------------------------------------------ */

const DAYS_BEFORE_MONTH = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

/** Linearly interpolated average daily temperature for Aalborg. */
export function avgTemperature(month: number, day: number): number {
    const doy = DAYS_BEFORE_MONTH[month - 1] + day;
    const temps = AALBORG_MONTHLY_TEMPS;
    const mid = DAYS_BEFORE_MONTH.map(d => d + 15);
    const midExt = [mid[11] - 365, ...mid, mid[0] + 365];
    const tExt = [temps[11], ...temps, temps[0]];
    for (let i = 0; i < midExt.length - 1; i++) {
        if (midExt[i] <= doy && doy <= midExt[i + 1]) {
            const frac = (doy - midExt[i]) / (midExt[i + 1] - midExt[i]);
            return Math.round((tExt[i] + (tExt[i + 1] - tExt[i]) * frac) * 10) / 10;
        }
    }
    return temps[month - 1];
}

/* --- Astronomy (Denmark-visible) -------------------------------------- */

/** Merged sky events; on a shared date eclipses beat solstices beat supermoons beat notables beat meteors. */
export function astroFor(months: YearMonth[]): DateMap {
    const merged: DateMap = new Map();
    for (const [y, m] of months) {
        for (const [sm, sd, t] of METEOR_SHOWERS) if (sm === m) merged.set(dateKey(y, sm, sd), t);
    }
    const put = (entries: [string, string][]) => {
        for (const [k, v] of entries) if (inMonths(k, months)) merged.set(k, v);
    };
    put(Object.entries(NOTABLE_EVENTS).filter(([, [, vis]]) => vis).map(([k, [t]]) => [k, t]));
    put(Object.entries(SUPERMOONS));
    put(Object.entries(SOLSTICES_EQUINOXES));
    put(ECLIPSES.filter(([, , vis]) => vis).map(([k, t]) => [k, t]));
    return merged;
}

/* --- Your dates: "YYYY-MM-DD | text" lines ---------------------------- */

export function parseDateLines(text: string, months: YearMonth[]): DateMap {
    const out: DateMap = new Map();
    for (const line of text.split('\n')) {
        const s = line.trim();
        if (!s || s.startsWith('#') || !s.includes('|')) continue;
        const bar = s.indexOf('|');
        const date = s.slice(0, bar).trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) continue;
        if (inMonths(date, months)) out.set(date, s.slice(bar + 1).trim());
    }
    return out;
}

/* --- Calendar files (.ics) -------------------------------------------- */

function zoneOffsetMinutes(tz: string, utcMs: number): number {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
        timeZone: tz, hourCycle: 'h23',
        year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
    }).formatToParts(new Date(utcMs)).map(x => [x.type, x.value]));
    return (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - utcMs) / 60000;
}

const isZone = (tz: string) => {
    try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; }
};

/** Wall-clock time in `tz` → epoch ms. */
function wallToUtc(y: number, mo: number, d: number, h: number, mi: number, s: number, tz: string): number {
    const wall = Date.UTC(y, mo - 1, d, h, mi, s);
    let utc = wall - zoneOffsetMinutes(tz, wall) * 60000;
    utc = wall - zoneOffsetMinutes(tz, utc) * 60000; // settle across a DST edge
    return utc;
}

/** Epoch ms → [YYYY-MM-DD, HH:MM] in Copenhagen. */
function toLocal(utcMs: number): [string, string] {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
        timeZone: LOCAL_TZ, hourCycle: 'h23',
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    }).formatToParts(new Date(utcMs)).map(x => [x.type, x.value]));
    return [`${p.year}-${p.month}-${p.day}`, `${p.hour}:${p.minute}`];
}

const unescapeText = (v: string) => v.replace(/\\([\\;,nN])/g, (_, c: string) => (c === 'n' || c === 'N' ? '\n' : c));

/** Splits `NAME;PARAM=x:value` at the first colon outside quotes. */
function splitProperty(line: string): [string, Record<string, string>, string] | null {
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') quoted = !quoted;
        else if (ch === ':' && !quoted) {
            const [name, ...params] = line.slice(0, i).split(';');
            const map: Record<string, string> = {};
            for (const p of params) {
                const eq = p.indexOf('=');
                if (eq > 0) map[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/^"|"$/g, '');
            }
            return [name.toUpperCase(), map, line.slice(i + 1)];
        }
    }
    return null;
}

/**
 * Events of one .ics file within [start, end), keyed by Copenhagen date, as
 * "HH:MM summary" or just "summary" for all-day events. Like the Python
 * version, recurring events appear on their first date only.
 */
export function parseIcs(text: string, start: string, end: string): Map<string, string[]> {
    const lines = text.replace(/\r\n?/g, '\n').replace(/\n[ \t]/g, '').split('\n');
    const out = new Map<string, string[]>();
    let depth = 0; // 1 = directly inside a VEVENT
    let summary = '';
    let dtstart: [Record<string, string>, string] | null = null;

    for (const line of lines) {
        const prop = splitProperty(line);
        if (!prop) continue;
        const [name, params, value] = prop;
        if (name === 'BEGIN') {
            if (depth > 0) depth++;
            else if (value.toUpperCase() === 'VEVENT') { depth = 1; summary = ''; dtstart = null; }
            continue;
        }
        if (name === 'END') {
            if (depth > 1) { depth--; continue; }
            if (depth === 1) {
                depth = 0;
                const entry = summary.trim() && dtstart ? eventEntry(summary.trim(), dtstart[0], dtstart[1]) : null;
                if (entry && start <= entry[0] && entry[0] < end) {
                    if (!out.has(entry[0])) out.set(entry[0], []);
                    out.get(entry[0])!.push(entry[1]);
                }
            }
            continue;
        }
        if (depth !== 1) continue;
        if (name === 'SUMMARY') summary = unescapeText(value);
        else if (name === 'DTSTART') dtstart = [params, value.trim()];
    }
    return out;
}

function eventEntry(summary: string, params: Record<string, string>, value: string): [string, string] | null {
    const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(value);
    if (!m) return null;
    const [, y, mo, d, h, mi, s, z] = m;
    if (h === undefined || params.VALUE === 'DATE') return [`${y}-${mo}-${d}`, summary];
    const tz = z ? 'UTC' : params.TZID && isZone(params.TZID) ? params.TZID : LOCAL_TZ;
    const [day, time] = toLocal(wallToUtc(+y, +mo, +d, +h, +mi, +(s ?? 0), tz));
    return [day, `${time} ${summary}`];
}

export interface IcsFile { name: string; text: string }

/**
 * Calendar files → per-day events, coloured per calendar, de-duplicated the
 * way generate_calendar_pdf does: when the same event (ignoring a time prefix)
 * is in several calendars on one day, keep the one whose calendar name's first
 * word appears in the event text, else the first.
 */
export function calendarEventsFor(files: IcsFile[], months: YearMonth[]): Map<string, CalEvent[]> {
    const [fy, fm] = months[0];
    const [ly, lm] = months[months.length - 1];
    const start = dateKey(fy, fm, 1);
    const end = lm === 12 ? dateKey(ly + 1, 1, 1) : dateKey(ly, lm + 1, 1);

    const colors = new Map<string, RGB>();
    const byDay = new Map<string, CalEvent[]>();
    for (const f of files) {
        if (!colors.has(f.name)) colors.set(f.name, CALENDAR_COLORS[colors.size % CALENDAR_COLORS.length]);
        const events = parseIcs(f.text, start, end);
        for (const day of [...events.keys()].sort()) {
            if (!inMonths(day, months)) continue;
            for (const entry of events.get(day)!.sort()) {
                if (!byDay.has(day)) byDay.set(day, []);
                byDay.get(day)!.push([f.name[0]?.toUpperCase() ?? '?', entry, colors.get(f.name)!, f.name]);
            }
        }
    }

    const core = (t: string) => (t.length > 5 && t[2] === ':' && t[5] === ' ' ? t.slice(6) : t);
    for (const [day, events] of byDay) {
        const seen = new Map<string, number>();
        events.forEach(([, text, , cal], i) => {
            const c = core(text);
            const prev = seen.get(c);
            if (prev === undefined) { seen.set(c, i); return; }
            const lower = c.toLowerCase();
            const cur = cal.split(/\s+/)[0].toLowerCase();
            const before = events[prev][3].split(/\s+/)[0].toLowerCase();
            if (lower.includes(cur) && !lower.includes(before)) seen.set(c, i);
        });
        const keep = new Set(seen.values());
        byDay.set(day, events.filter((_, i) => keep.has(i)));
    }
    return byDay;
}
