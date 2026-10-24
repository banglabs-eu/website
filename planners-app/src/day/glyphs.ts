/* GlyphClock time maths for the day planners — schedule.lua and
   solo-schedule.lua, generalised from a whole-hour \utcoffset to any offset
   in minutes. */

// GlyphClock order, index 0 starting at 00:00 UTC. Files are GlyphClock's own art.
export const GLYPHS = [
    'croissant', 'butterfly', 'tulip', 'umbrella',
    'cactus', 'balloon', 'glasses', 'anchor',
    'peacock', 'robot', 'star', 'cloud',
    'tree', 'kite', 'chair', 'recycle',
];

const BLOCK = 90;
const DAY = 1440;

const mod = (n: number, m: number) => ((n % m) + m) % m;

export function hhmm(mins: number): string {
    const m = mod(Math.round(mins), DAY);
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** Minutes east of UTC for `tz` at local noon on `isoDate`. */
export function utcOffset(tz: string, isoDate: string): number {
    const [y, m, d] = isoDate.split('-').map(Number);
    const at = new Date(Date.UTC(y, m - 1, d, 12));
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
        timeZone: tz, hourCycle: 'h23',
        year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric',
    }).formatToParts(at).map(x => [x.type, x.value]));
    return Math.round((Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - at.getTime()) / 60000);
}

export function offsetLabel(off: number): string {
    const a = Math.abs(off);
    const mins = a % 60 ? ':' + String(a % 60).padStart(2, '0') : '';
    return `UTC${off < 0 ? '−' : '+'}${Math.floor(a / 60)}${mins}`;
}

export interface HalfHourRow {
    time: string;
    block: number;
    /** Rows this glyph cell spans; set on the first row of each block only. */
    span?: number;
    shade?: boolean;
}

/** 30-minute rows from startH:00 to endH:00 inclusive, grouped into glyph blocks. */
export function halfHourRows(startH: number, endH: number, offset: number): HalfHourRow[] {
    const rows: HalfHourRow[] = [];
    for (let mins = startH * 60; mins <= endH * 60; mins += 30) {
        rows.push({ time: hhmm(mins), block: Math.min(Math.floor(mod(mins - offset, DAY) / BLOCK), 15) });
    }
    let n = 0;
    rows.forEach((r, i) => {
        if (i > 0 && rows[i - 1].block === r.block) return;
        n++;
        const next = rows.findIndex((x, j) => j > i && x.block !== r.block);
        r.span = (next === -1 ? rows.length : next) - i;
        r.shade = n % 2 === 0; // first block unshaded
    });
    return rows;
}

export interface BlockRow { block: number; time: string }

/**
 * `count` consecutive glyph blocks, the first being the earliest that starts
 * at or after `fromMins` local time, skipping `skip`. A fixed row count keeps
 * the folded layouts filling their panels in every time zone.
 */
export function blockRows(fromMins: number, count: number, offset: number, skip = 0): BlockRow[] {
    const first = Math.ceil(mod(fromMins - offset, DAY) / BLOCK) + skip;
    return Array.from({ length: count }, (_, i) => {
        const block = mod(first + i, 16);
        return { block, time: hhmm(block * BLOCK + offset) };
    });
}
