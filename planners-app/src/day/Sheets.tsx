/* Day planner sheets — HTML ports of Planners/day-planner/*.tex. Each sheet is
   sized in millimetres, so it is both the on-screen preview and the printout. */
import type { ReactNode } from 'react';
import { GLYPHS, blockRows, halfHourRows, type BlockRow } from './glyphs';

export type Variant = 'shared' | 'solo' | 'fold' | 'three';

export interface DayOptions {
    variant: Variant;
    offset: number;
    title: string;
    personL: string;
    personR: string;
    startHour: number;
    endHour: number;
    dayStart: number;
    pages: number;
}

export const LAYOUTS: Record<Variant, { orientation: 'portrait' | 'landscape'; title: string }> = {
    shared: { orientation: 'portrait', title: 'Shared Day Plan' },
    solo: { orientation: 'portrait', title: 'Day Plan' },
    fold: { orientation: 'landscape', title: 'Day Plan' },
    three: { orientation: 'landscape', title: '3-Day Plan' },
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const Glyph = ({ block }: { block: number }) => (
    <img className="glyph" src={`${import.meta.env.BASE_URL}emoji/${GLYPHS[block]}.svg`} alt={GLYPHS[block]} />
);

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

const Dates = ({ from = 1, to = 31 }: { from?: number; to?: number }) => (
    <div className="spread">{range(from, to).map(d => <span key={d}>{d}</span>)}</div>
);

const Weekdays = () => (
    <div className="spread spread--days">{WEEKDAYS.map(d => <span key={d}>{d}</span>)}</div>
);

const Rules = ({ n, className = '' }: { n: number; className?: string }) => (
    <div className={`rules ${className}`}>{range(1, n).map(i => <i key={i} />)}</div>
);

const RuledBox = ({ title, n, className = '' }: { title: ReactNode; n: number; className?: string }) => (
    <div className={`box ${className}`}><h3>{title}</h3><Rules n={n} /></div>
);

const BarBox = ({ title, n, loose }: { title: string; n: number; loose?: boolean }) => (
    <div className={`bar-box${loose ? ' bar-box--loose' : ''}`}><h4>{title}</h4><Rules n={n} /></div>
);

const NameBlank = ({ name }: { name: string }) => (name ? <>{name}</> : <span className="blank" />);

interface Column { cls: string; label?: string; pri?: boolean }

/** The A4 schedule: merged glyph cell per block, time, then the given columns. */
function HalfHourTable({ o, cols }: { o: DayOptions; cols: Column[] }) {
    const rows = halfHourRows(o.startHour, o.endHour, o.offset);
    return (
        <div className="sched-wrap">
            <table className="sched sched--half">
                <thead>
                    <tr>
                        <th className="c-glyph" /><th className="c-time" />
                        {cols.map((c, i) => <th key={i} className={c.cls}>{c.label}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'shade' : undefined}>
                            {r.span !== undefined && (
                                <td className={`c-glyph ${r.shade ? 'shade' : 'plain'}`} rowSpan={r.span}><Glyph block={r.block} /></td>
                            )}
                            <td className="c-time">{r.time}</td>
                            {cols.map((c, j) => <td key={j} className={c.cls}>{c.pri && <b className="pri" />}</td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/** The folded layouts' schedule: glyph stacked over its start time, then writing columns. */
const BlockTable = ({ rows, writeCols }: { rows: BlockRow[]; writeCols: number }) => (
    <table className="sched sched--block">
        <tbody>
            {rows.map((r, i) => (
                <tr key={i} className={i % 2 === 0 ? 'shade' : undefined}>
                    <td className="c-stack"><Glyph block={r.block} /><span>{r.time}</span></td>
                    {range(1, writeCols).map(c => <td key={c} className="c-write" />)}
                </tr>
            ))}
        </tbody>
    </table>
);

const Foot = () => (
    <div className="pair pair--foot"><RuledBox title="Notes" n={3} /><RuledBox title="Upcoming" n={3} /></div>
);

function Shared({ o }: { o: DayOptions }) {
    return (
        <div className="sheet sheet--a4p layout-a4">
            <header className="a4-head"><h2>{o.title}</h2><Dates /><Weekdays /></header>
            <div className="pair">
                <RuledBox title={<><NameBlank name={o.personL} />’s Goal</>} n={3} />
                <RuledBox title={<><NameBlank name={o.personR} />’s Goal</>} n={3} />
            </div>
            <HalfHourTable o={o} cols={[
                { cls: 'c-pri c-dash', pri: true },
                { cls: 'c-write', label: o.personL },
                { cls: 'c-shared c-dash', label: 'Shared' },
                { cls: 'c-write c-dash c-right', label: o.personR },
                { cls: 'c-pri', pri: true },
            ]} />
            <Foot />
        </div>
    );
}

function Solo({ o }: { o: DayOptions }) {
    return (
        <div className="sheet sheet--a4p layout-a4">
            <header className="a4-head"><h2>{o.title}</h2><Weekdays /><Dates /></header>
            <RuledBox title="Goal" n={2} className="box--solo" />
            <HalfHourTable o={o} cols={[
                { cls: 'c-pri c-dash', pri: true },
                { cls: 'c-write', label: 'Plan' },
                { cls: 'c-write c-dash c-right', label: 'Actual' },
            ]} />
            <Foot />
        </div>
    );
}

/** solo-planner-page.tex: 4×2 A7 cells on A4 landscape, folds to A7. */
function Fold({ o }: { o: DayOptions }) {
    return (
        <div className="sheet sheet--a4l layout-fold">
            <div className="guide guide--v1" />
            <div className="guide guide--h" />
            <div className="guide guide--v3 guide--q1" />
            <div className="guide guide--v3 guide--q3" />
            <div className="cell cell--wide cell--tl"><BlockTable rows={blockRows(o.dayStart, 5, o.offset)} writeCols={2} /></div>
            <div className="cell cell--wide cell--bl"><BlockTable rows={blockRows(o.dayStart, 6, o.offset, 5)} writeCols={2} /></div>
            <div className="cell cell--c3 cell--top"><Rules n={13} className="rules--loose" /></div>
            <div className="cell cell--c3 cell--bottom"><Rules n={13} className="rules--loose" /></div>
            <div className="cell cell--c4 cell--top">
                <div className="mini-dates"><Dates to={16} /><Dates from={17} /><Weekdays /></div>
                <BarBox title="Goal" n={8} loose />
            </div>
            <div className="cell cell--c4 cell--bottom"><BarBox title="Notes" n={11} /></div>
        </div>
    );
}

function DayPanel({ o, pos }: { o: DayOptions; pos: string }) {
    return (
        <div className={`panel panel--${pos}`}>
            <div className="panel__head">
                <div className="mini-dates"><Dates /><Weekdays /></div>
                <div className="today"><span>Today I</span><Rules n={3} /></div>
            </div>
            <BlockTable rows={blockRows(o.dayStart, 11, o.offset)} writeCols={1} />
        </div>
    );
}

/** 3day-planner-*.tex: side A holds days 1–2, side B day 3 between four A7 corners. */
const ThreeA = ({ o }: { o: DayOptions }) => (
    <div className="sheet sheet--a4l layout-three"><DayPanel o={o} pos="left" /><DayPanel o={o} pos="right" /></div>
);

const ThreeB = ({ o }: { o: DayOptions }) => (
    <div className="sheet sheet--a4l layout-three">
        <div className="corner corner--tl"><BarBox title="Notes" n={11} /></div>
        <div className="corner corner--tr"><BarBox title="Goal" n={11} /></div>
        <div className="corner corner--bl"><BarBox title="Notes" n={11} /></div>
        <div className="corner corner--br"><BarBox title="Notes" n={11} /></div>
        <DayPanel o={o} pos="center" />
    </div>
);

/** All sheets for the options, in print order. */
export function sheetsFor(o: DayOptions): ReactNode[] {
    if (o.variant === 'three') return [<ThreeA key="a" o={o} />, <ThreeB key="b" o={o} />];
    const Page = { shared: Shared, solo: Solo, fold: Fold }[o.variant];
    return range(1, o.pages).map(p => <Page key={p} o={o} />);
}
