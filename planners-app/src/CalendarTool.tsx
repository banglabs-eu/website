import { useEffect, useState, type FormEvent } from 'react';
import { useStored } from './storage';

type Layout = 'four' | 'overview';

const pad = (n: number) => String(n).padStart(2, '0');

export default function CalendarTool() {
    const now = new Date();
    const [layout, setLayout] = useState<Layout>('four');
    const [start, setStart] = useState(`${now.getFullYear()}-${pad(now.getMonth() + 1)}`);
    const [months, setMonths] = useState(8);
    const [cols, setCols] = useState(2);
    const [dates, setDates] = useStored('calDates', '');
    const [files, setFiles] = useState<File[]>([]);
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);
    const [pdf, setPdf] = useState<{ url: string; name: string } | null>(null);

    useEffect(() => () => { if (pdf) URL.revokeObjectURL(pdf.url); }, [pdf]);

    async function generate(e: FormEvent) {
        e.preventDefault();
        const [year, month] = start.split('-').map(Number);
        if (!year || !month) return;
        setBusy(true);
        setStatus(null);
        try {
            // pdf-lib is most of the bundle; fetch it only when a calendar is drawn.
            const { fourMonthPdf, overviewPdf } = await import('./calendar/pdf');
            const bytes = layout === 'overview'
                ? await overviewPdf({ year, month, months: Math.max(2, Math.min(12, months || 8)), cols: Math.max(1, Math.min(3, cols || 2)) })
                : await fourMonthPdf({
                    year, month, dates,
                    files: await Promise.all(files.map(async f => ({
                        name: f.name.replace(/\.ics$/i, '').trim() || 'Calendar',
                        text: await f.text(),
                    }))),
                });
            const name = layout === 'overview' ? `calendar_overview_${year}_${pad(month)}.pdf` : `calendar_${year}_${pad(month)}.pdf`;
            setPdf({ url: URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' })), name });
            setStatus({ text: 'Done. Print at 100% scale, A4.' });
        } catch (err) {
            console.error(err);
            setStatus({ text: `Could not generate the calendar: ${(err as Error).message}`, error: true });
        } finally {
            setBusy(false);
        }
    }

    return (
        <section className="tool">
            <form className="controls" autoComplete="off" onSubmit={generate}>
                <fieldset className="variants">
                    <legend>Layout</legend>
                    <label className="variant">
                        <input type="radio" name="layout" checked={layout === 'four'} onChange={() => setLayout('four')} />
                        <span className="variant__name">Four months</span>
                        <span className="variant__desc">Two A4 sheets, one A5 month per half, room to write each day.</span>
                    </label>
                    <label className="variant">
                        <input type="radio" name="layout" checked={layout === 'overview'} onChange={() => setLayout('overview')} />
                        <span className="variant__name">Overview</span>
                        <span className="variant__desc">Up to twelve small months on a single A4 page.</span>
                    </label>
                </fieldset>

                <div className="fields">
                    <label className="field">
                        <span>Start month</span>
                        <input type="month" required value={start} onChange={e => setStart(e.target.value)} />
                    </label>
                    {layout === 'overview' ? <>
                        <label className="field">
                            <span>Months</span>
                            <input type="number" min={2} max={12} value={months} onChange={e => setMonths(+e.target.value)} />
                        </label>
                        <label className="field">
                            <span>Columns</span>
                            <input type="number" min={1} max={3} value={cols} onChange={e => setCols(+e.target.value)} />
                        </label>
                    </> : <>
                        <label className="field field--wide">
                            <span>Your dates <small>one per line: <code>2026-12-24 | Juleaften</code></small></span>
                            <textarea rows={5} spellCheck={false} value={dates} onChange={e => setDates(e.target.value)}
                                placeholder={'2026-11-14 | Mormor 80 år\n2027-01-09 | Ski trip'} />
                        </label>
                        <label className="field field--wide">
                            <span>Calendar files <small>.ics exports — each file becomes one coloured calendar, named after the file</small></span>
                            <input type="file" accept=".ics,text/calendar" multiple onChange={e => setFiles([...(e.target.files ?? [])])} />
                        </label>
                    </>}
                </div>

                <div className="actions">
                    <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'Drawing…' : 'Generate PDF'}</button>
                    {pdf && <a className="btn btn--ghost" href={pdf.url} download={pdf.name}>Download</a>}
                    {status && <p className={`actions__hint${status.error ? ' is-error' : ''}`}>{status.text}</p>}
                </div>
            </form>

            {pdf && <div className="preview preview--pdf"><iframe src={pdf.url} title="Calendar preview" /></div>}

            <div className="section about">
                <span className="section__kicker">What is on it</span>
                <p>
                    Weeks run Monday to Sunday under Japanese day kanji, with ISO week
                    numbers and the two-week sprint they fall in. Danish public holidays
                    and weekends are tinted; Danish tax and property deadlines are
                    marked. Eclipses, meteor showers, solstices and supermoons visible
                    from Denmark are drawn in, along with the average Aalborg temperature
                    for each day and a quote at the head of each month.
                </p>
                <p>
                    Calendar files come from any calendar app's export — in Google
                    Calendar, Settings → Import &amp; export. Event times are shown in
                    Copenhagen time. Emoji and characters outside Western European
                    alphabets are left out of the PDF.
                </p>
            </div>
        </section>
    );
}
