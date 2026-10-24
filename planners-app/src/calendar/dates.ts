/* Plain calendar-date helpers. Dates are keyed as "YYYY-MM-DD" strings, the
   TypeScript stand-in for calendar_print.py's datetime.date dict keys. */

export type YearMonth = [year: number, month: number];

export const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const pad = (n: number) => String(n).padStart(2, '0');

export const dateKey = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

export function addDays(y: number, m: number, d: number, days: number): string {
    const t = new Date(Date.UTC(y, m - 1, d + days));
    return dateKey(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

export const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Monday = 0 … Sunday = 6, like Python's date.weekday(). */
export const weekday = (y: number, m: number, d: number) => (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;

export function isoWeek(y: number, m: number, d: number): number {
    const t = new Date(Date.UTC(y, m - 1, d));
    t.setUTCDate(t.getUTCDate() + 3 - ((t.getUTCDay() + 6) % 7)); // Thursday of this week
    const jan4 = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
    return 1 + Math.round(((t.getTime() - jan4.getTime()) / 86400000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
}

/** `count` consecutive months starting at (year, month). */
export function monthRange(year: number, month: number, count: number): YearMonth[] {
    return Array.from({ length: count }, (_, i) => {
        const m0 = month - 1 + i;
        return [year + Math.floor(m0 / 12), (m0 % 12) + 1] as YearMonth;
    });
}

export function inMonths(key: string, months: YearMonth[]): boolean {
    const y = +key.slice(0, 4);
    const m = +key.slice(5, 7);
    return months.some(([my, mm]) => my === y && mm === m);
}

/** Weeks of a month, Monday–Sunday, with null for days outside it. */
export function getWeeks(year: number, month: number): (number | null)[][] {
    const last = daysInMonth(year, month);
    const weeks: (number | null)[][] = [];
    let cur: (number | null)[] = Array(7).fill(null);
    for (let d = 1; d <= last; d++) {
        const col = weekday(year, month, d);
        cur[col] = d;
        if (col === 6 || d === last) {
            weeks.push(cur);
            cur = Array(7).fill(null);
        }
    }
    return weeks;
}

export function isoWeekForRow(year: number, month: number, week: (number | null)[]): number {
    const d = week.find(x => x !== null);
    return d == null ? 0 : isoWeek(year, month, d);
}

export function monthWeekRange(year: number, month: number, weeks: (number | null)[][]): string {
    const wks = [...new Set(weeks.map(w => isoWeekForRow(year, month, w)).filter(Boolean))].sort((a, b) => a - b);
    if (!wks.length) return '';
    if (wks.length === 1) return `(W${wks[0]})`;
    return `(W${wks[0]}–${wks[wks.length - 1]})`;
}
