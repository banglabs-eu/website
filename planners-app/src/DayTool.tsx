import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { LAYOUTS, orientationFor, sheetsFor, type DayOptions, type Variant } from './day/Sheets';
import { MAX_DAYS, daysBetween, defaultTitle, preset } from './day/Range';
import { hhmm, offsetLabel, utcOffset } from './day/glyphs';
import { useStored } from './storage';

const VARIANTS: { value: Variant; name: string; desc: string }[] = [
    { value: 'shared', name: 'Shared day', desc: 'A4. Two people, a shared column between them.' },
    { value: 'solo', name: 'Solo day', desc: 'A4. Plan and actual, side by side.' },
    { value: 'fold', name: 'Pocket fold', desc: 'A4 landscape. Folds three times into an A7 booklet.' },
    { value: 'three', name: 'Three days', desc: 'A4 landscape, both sides. Three days, folds to A7.' },
    { value: 'range', name: 'Week & month', desc: 'Any span of days on one A4 sheet, each day as large as it fits.' },
];

const LOCAL_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Copenhagen';
const ZONES = (() => {
    const z = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
    return [...new Set(['UTC', LOCAL_ZONE, ...z])];
})();

function todayIso() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const hours = (from: number, count: number) => Array.from({ length: count }, (_, i) => from + i);

function Field({ label, wide, children }: { label: ReactNode; wide?: boolean; children: ReactNode }) {
    return <label className={`field${wide ? ' field--wide' : ''}`}><span>{label}</span>{children}</label>;
}

/** Sheets at true size, scaled down to the preview column's width. */
function Preview({ sheets }: { sheets: ReactNode[] }) {
    const ref = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);
    useEffect(() => {
        const el = ref.current!;
        const ro = new ResizeObserver(() => setWidth(el.clientWidth));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    useLayoutEffect(() => {
        ref.current!.querySelectorAll<HTMLElement>('.sheet-frame').forEach(frame => {
            const sheet = frame.firstElementChild as HTMLElement;
            const scale = Math.min(1, width / sheet.offsetWidth);
            sheet.style.transform = `scale(${scale})`;
            frame.style.width = `${sheet.offsetWidth * scale}px`;
            frame.style.height = `${sheet.offsetHeight * scale}px`;
        });
    });
    return (
        <div className="preview" ref={ref} aria-label="Preview">
            {sheets.map((s, i) => <div className="sheet-frame" key={i}>{s}</div>)}
        </div>
    );
}

export default function DayTool() {
    const [variant, setVariant] = useStored<Variant>('variant', 'shared');
    const [tz, setTz] = useStored('tz', LOCAL_ZONE);
    const [date, setDate] = useState(todayIso);
    const [titles, setTitles] = useStored<Partial<Record<Variant, string>>>('titles', {});
    const [personL, setPersonL] = useStored('personL', '');
    const [personR, setPersonR] = useStored('personR', '');
    const [startHour, setStartHour] = useStored('startHour', 7);
    const [endHour, setEndHour] = useStored('endHour', 22);
    const [dayStart, setDayStart] = useStored('dayStart', 390);
    const [pages, setPages] = useStored('pages', 2);
    const [[rangeStart, rangeEnd], setRange] = useState(() => preset('week', todayIso()));
    const [weekColumns, setWeekColumns] = useStored('weekColumns', true);

    const zone = ZONES.includes(tz) ? tz : LOCAL_ZONE;
    const day = date || todayIso();
    const offset = utcOffset(zone, day);
    const title = titles[variant] ?? LAYOUTS[variant].title;
    const [from, to] = rangeStart <= rangeEnd ? [rangeStart, rangeEnd] : [rangeEnd, rangeStart];
    const span = daysBetween(from, to); // capped at MAX_DAYS
    const total = Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1;

    const options: DayOptions = {
        variant, offset, title: title.trim(), personL: personL.trim(), personR: personR.trim(),
        startHour, endHour: Math.max(endHour, startHour + 1), dayStart,
        pages: Math.max(1, Math.min(31, pages || 1)),
        rangeStart: from, rangeEnd: span.length ? span[span.length - 1].key : to, weekColumns,
    };
    const orientation = orientationFor(options);

    // The printed page size follows the layout.
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `@page { size: A4 ${orientation}; margin: 0; }`;
        document.head.appendChild(style);
        return () => style.remove();
    }, [orientation]);

    // Ctrl+P prints the planner too, as long as this tool is showing.
    useEffect(() => {
        const on = () => document.body.classList.add('printing-day');
        const off = () => document.body.classList.remove('printing-day');
        window.addEventListener('beforeprint', on);
        window.addEventListener('afterprint', off);
        return () => { off(); window.removeEventListener('beforeprint', on); window.removeEventListener('afterprint', off); };
    }, []);

    const year = day.slice(0, 4);
    const jan = utcOffset(zone, `${year}-01-15`);
    const jul = utcOffset(zone, `${year}-07-15`);
    const show = (...v: Variant[]) => v.includes(variant);

    return (
        <section className="tool tool--day">
            <form className="controls" autoComplete="off" onSubmit={e => e.preventDefault()}>
                <fieldset className="variants">
                    <legend>Layout</legend>
                    {VARIANTS.map(v => (
                        <label className="variant" key={v.value}>
                            <input type="radio" name="variant" checked={variant === v.value} onChange={() => setVariant(v.value)} />
                            <span className="variant__name">{v.name}</span>
                            <span className="variant__desc">{v.desc}</span>
                        </label>
                    ))}
                </fieldset>

                <div className="fields">
                    {show('range') ? <>
                        <Field label="Start">
                            <input type="date" required value={rangeStart} onChange={e => e.target.value && setRange([e.target.value, rangeEnd])} />
                        </Field>
                        <Field label="End">
                            <input type="date" required value={rangeEnd} onChange={e => e.target.value && setRange([rangeStart, e.target.value])} />
                        </Field>
                        <div className="presets field--wide">
                            {([['week', 'This week'], ['nextWeek', 'Next week'], ['month', 'This month'], ['nextMonth', 'Next month']] as const).map(([k, label]) => (
                                <button type="button" key={k} className="chip" onClick={() => setRange(preset(k, todayIso()))}>{label}</button>
                            ))}
                        </div>
                        <p className="field-note field--wide">
                            {total > MAX_DAYS
                                ? `${total} days chosen; one sheet holds at most ${MAX_DAYS}, so it shows the first ${MAX_DAYS}.`
                                : `${span.length} day${span.length === 1 ? '' : 's'}, A4 ${orientation}, laid out for the largest boxes that fit.`}
                        </p>
                        <Field label="Title" wide>
                            <input type="text" maxLength={60} value={titles.range ?? ''} placeholder={span.length ? defaultTitle(span) : ''}
                                onChange={e => setTitles({ ...titles, range: e.target.value })} />
                        </Field>
                        <label className="check field--wide">
                            <input type="checkbox" checked={weekColumns} onChange={e => setWeekColumns(e.target.checked)} />
                            Keep weekdays in columns, Monday to Sunday
                        </label>
                    </> : <>
                    <Field label="Time zone" wide>
                        <select value={zone} onChange={e => setTz(e.target.value)}>
                            {ZONES.map(z => <option key={z} value={z}>{z.replace(/_/g, ' ')}</option>)}
                        </select>
                    </Field>
                    <Field label="For the date">
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} />
                    </Field>
                    <p className="field-note field--wide">
                        {offsetLabel(offset)} on that date.
                        {jan !== jul && ` This zone also uses ${offsetLabel(offset === jan ? jul : jan)} part of the year, which moves every glyph — print a new set when the clocks change.`}
                    </p>
                    </>}

                    {show('shared', 'solo') && (
                        <Field label="Title" wide>
                            <input type="text" maxLength={40} value={title} onChange={e => setTitles({ ...titles, [variant]: e.target.value })} />
                        </Field>
                    )}
                    {show('shared') && <>
                        <Field label="Left name">
                            <input type="text" maxLength={20} placeholder="blank to write in" value={personL} onChange={e => setPersonL(e.target.value)} />
                        </Field>
                        <Field label="Right name">
                            <input type="text" maxLength={20} placeholder="blank to write in" value={personR} onChange={e => setPersonR(e.target.value)} />
                        </Field>
                    </>}
                    {show('shared', 'solo') && <>
                        <Field label="First row">
                            <select value={startHour} onChange={e => setStartHour(+e.target.value)}>
                                {hours(4, 13).map(h => <option key={h} value={h}>{hhmm(h * 60)}</option>)}
                            </select>
                        </Field>
                        <Field label="Last row">
                            <select value={endHour} onChange={e => setEndHour(+e.target.value)}>
                                {hours(15, 10).map(h => <option key={h} value={h}>{hhmm(h * 60)}</option>)}
                            </select>
                        </Field>
                    </>}
                    {show('fold', 'three') && (
                        <Field label="Day starts">
                            <select value={dayStart} onChange={e => setDayStart(+e.target.value)}>
                                {hours(0, 9).map(i => 240 + i * 30).map(m => <option key={m} value={m}>from {hhmm(m)}</option>)}
                            </select>
                        </Field>
                    )}
                    {show('shared', 'solo', 'fold') && (
                        <Field label="Pages">
                            <input type="number" min={1} max={31} value={pages} onChange={e => setPages(+e.target.value)} />
                        </Field>
                    )}
                </div>

                <div className="actions">
                    <button type="button" className="btn btn--primary" onClick={() => window.print()}>Print / save PDF</button>
                    <p className="actions__hint">
                        {variant === 'three'
                            ? 'Print both sides at 100% scale with no margins, flipping on the short edge. Choose “Save as PDF” to keep a file.'
                            : 'Print at 100% scale with no margins. In the dialog, choose “Save as PDF” to keep a file.'}
                    </p>
                </div>
            </form>

            <Preview sheets={sheetsFor(options)} />
        </section>
    );
}
