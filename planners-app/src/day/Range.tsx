/* Week & month planner: any span of days on one A4 sheet, each day box as
   large as the sheet allows. No glyphs — this one is about days, not hours. */
import { addDays, dateKey, daysInMonth, isoWeek, monthRange, weekday } from '../calendar/dates';
import { holidaysFor } from '../calendar/events';

export const MAX_DAYS = 62;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Usable sheet area in mm: 8mm margins and a 12mm title band.
const MARGIN = 8;
const TITLE = 12;
const AREA = {
    portrait: { w: 210 - 2 * MARGIN, h: 297 - 2 * MARGIN - TITLE },
    landscape: { w: 297 - 2 * MARGIN, h: 210 - 2 * MARGIN - TITLE },
};
/** Boxes are never thinner than this ratio, so a day never becomes a sliver. */
const MAX_ASPECT = 3;

type Orientation = 'portrait' | 'landscape';

interface Day { key: string; y: number; m: number; d: number; wd: number }

export interface RangePlan {
    orientation: Orientation;
    cols: number;
    rows: number;
    /** Grid slots in reading order; null is an empty slot before/after the span. */
    slots: (Day | null)[];
    /** Slot holding a Notes box instead of a day, if any. */
    notes?: number;
}

const parse = (iso: string): [number, number, number] => iso.split('-').map(Number) as [number, number, number];

export function daysBetween(start: string, end: string): Day[] {
    const days: Day[] = [];
    const [y, m, d] = parse(start);
    for (let i = 0; i < MAX_DAYS; i++) {
        const key = addDays(y, m, d, i);
        if (key > end) break;
        const [ky, km, kd] = parse(key);
        days.push({ key, y: ky, m: km, d: kd, wd: weekday(ky, km, kd) });
    }
    return days;
}

/** Usable box area, discounted once a box is thinner than MAX_ASPECT. */
function score(w: number, h: number): number {
    const aspect = Math.max(w / h, h / w);
    return w * h * Math.min(1, MAX_ASPECT / aspect);
}

/**
 * The grid with the biggest day boxes. With `weekColumns`, columns are Mon–Sun
 * and rows are the weeks the span touches; otherwise days flow through
 * whichever columns × rows fits best. Portrait wins ties.
 */
export function planRange(days: Day[], weekColumns: boolean): RangePlan {
    // Inside one Mon–Sun week, weekday columns are just slivers. A full week
    // gets the classic 2×4 portrait grid with Notes in the eighth box; part of
    // a week flows into whichever grid gives the biggest boxes.
    if (weekColumns && days[0].wd + days.length <= 7) {
        if (days.length === 7) return { orientation: 'portrait', cols: 2, rows: 4, slots: [...days, null], notes: 7 };
        weekColumns = false;
    }
    let best: RangePlan | null = null;
    let bestScore = -1;
    for (const orientation of ['portrait', 'landscape'] as Orientation[]) {
        const { w, h } = AREA[orientation];
        const shapes: [number, number][] = [];
        if (weekColumns) {
            shapes.push([7, Math.ceil((days[0].wd + days.length) / 7)]);
        } else {
            for (let cols = 1; cols <= days.length; cols++) shapes.push([cols, Math.ceil(days.length / cols)]);
        }
        for (const [cols, rows] of shapes) {
            const s = score(w / cols, h / rows);
            if (s > bestScore + 1e-6) {
                bestScore = s;
                const lead = weekColumns ? days[0].wd : 0;
                const slots: (Day | null)[] = [...Array(lead).fill(null), ...days];
                while (slots.length < cols * rows) slots.push(null);
                best = { orientation, cols, rows, slots };
            }
        }
    }
    return best!;
}

/** "Week 44 · 26 Oct – 1 Nov 2026", "November 2026" or "26 Oct – 15 Nov 2026". */
export function defaultTitle(days: Day[]): string {
    const a = days[0];
    const b = days[days.length - 1];
    if (a.d === 1 && a.m === b.m && a.y === b.y && b.d === daysInMonth(b.y, b.m)) return `${FULL_MONTHS[a.m - 1]} ${a.y}`;
    const span = `${a.d} ${MONTHS[a.m - 1]}${a.y !== b.y ? ` ${a.y}` : ''} – ${b.d} ${MONTHS[b.m - 1]} ${b.y}`;
    if (days.length === 7 && a.wd === 0) return `Week ${isoWeek(a.y, a.m, a.d)} · ${span}`;
    return span;
}

/** Start and end of this/next week or month, relative to `today`. */
export function preset(kind: 'week' | 'nextWeek' | 'month' | 'nextMonth', today: string): [string, string] {
    const [y, m, d] = parse(today);
    if (kind === 'week' || kind === 'nextWeek') {
        const monday = addDays(y, m, d, -weekday(y, m, d) + (kind === 'nextWeek' ? 7 : 0));
        const [my, mm, md] = parse(monday);
        return [monday, addDays(my, mm, md, 6)];
    }
    const [ty, tm] = monthRange(y, m, kind === 'nextMonth' ? 2 : 1).pop()!;
    return [dateKey(ty, tm, 1), dateKey(ty, tm, daysInMonth(ty, tm))];
}

// Enough 7mm lines for the tallest box (a single day on a portrait sheet); the box clips the rest.
const RULES = Array.from({ length: 40 }, (_, i) => <i key={i} />);

export function RangeSheet({ title, plan }: { title: string; plan: RangePlan }) {
    const days = plan.slots.filter((s): s is Day => s !== null);
    const months = [...new Map(days.map(d => [`${d.y}-${d.m}`, [d.y, d.m] as [number, number]])).values()];
    const holidays = holidaysFor(months);
    return (
        <div className={`sheet sheet--${plan.orientation === 'portrait' ? 'a4p' : 'a4l'} layout-range`}>
            <h2 className="range-title">{title}</h2>
            <div className="range-grid" style={{ gridTemplateColumns: `repeat(${plan.cols}, 1fr)`, gridTemplateRows: `repeat(${plan.rows}, 1fr)` }}>
                {plan.slots.map((day, i) => {
                    const filled = (j: number) => Boolean(plan.slots[j]) || j === plan.notes;
                    // Each box draws its right and bottom edge, plus top/left where no box neighbours it.
                    const edges = [
                        (i < plan.cols || !filled(i - plan.cols)) && 'range-day--top',
                        (i % plan.cols === 0 || !filled(i - 1)) && 'range-day--left',
                    ];
                    if (i === plan.notes) {
                        return (
                            <div key={i} className={['range-day', ...edges].filter(Boolean).join(' ')}>
                                <div className="range-day__head"><b>Notes</b></div>
                                <div className="range-day__rules">{RULES}</div>
                            </div>
                        );
                    }
                    if (!day) return <div key={i} />;
                    const first = i === 0 || plan.slots[i - 1] === null;
                    const weekStart = day.wd === 0 || first;
                    const holiday = holidays.get(day.key);
                    const showMonth = day.d === 1 || first;
                    const off = (day.wd >= 5 || holiday) && 'range-day--off';
                    return (
                        <div key={i} className={['range-day', ...edges, off].filter(Boolean).join(' ')}>
                            <div className="range-day__head">
                                <b>{WEEKDAYS[day.wd]} {day.d}{showMonth && ` ${MONTHS[day.m - 1]}`}</b>
                                {holiday && <span className="range-day__holiday">{holiday}</span>}
                                {weekStart && <span className="range-day__week">W{isoWeek(day.y, day.m, day.d)}</span>}
                            </div>
                            <div className="range-day__rules">{RULES}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
