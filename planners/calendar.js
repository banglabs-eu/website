/* Calendar — runs Planners/calendar_print.py unchanged, in Pyodide.
 *
 * py/calendar_print.py and py/astro_events.py are copies made by
 * `make web` in the Planners repo; edit them there, not here.
 *
 * The script fetches iCal feeds with urllib. A browser cannot reach most
 * calendar feeds (no CORS headers), so the page takes .ics files instead and
 * hands them to the unmodified sync code through a stand-in for urlopen.
 */
const CalendarTool = (() => {
    const PYODIDE = 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/';
    const SOURCES = ['calendar_print.py', 'astro_events.py'];
    const UPLOAD_URL = 'https://upload.invalid/';
    let ready = null;

    const GLUE = `
import io, sys
sys.path.insert(0, "/planners")
import calendar_print as cp

UPLOADS = {}

def set_uploads(items):
    UPLOADS.clear()
    for url, buf in items:
        UPLOADS[url] = buf.to_bytes()

def _urlopen(req):
    return io.BytesIO(UPLOADS[getattr(req, "full_url", req)])

cp.urlopen = _urlopen
`;

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src;
            s.onload = resolve;
            s.onerror = () => reject(new Error(`Could not load ${src}`));
            document.head.appendChild(s);
        });
    }

    // Loads Pyodide, reportlab, icalendar and the planner sources once.
    function init(onStatus) {
        if (ready) return ready;
        ready = (async () => {
            onStatus('Loading the Python runtime…');
            await loadScript(PYODIDE + 'pyodide.js');
            const py = await loadPyodide({ indexURL: PYODIDE });
            onStatus('Installing reportlab and icalendar…');
            await py.loadPackage('micropip');
            await py.runPythonAsync(`
import micropip
await micropip.install(["reportlab", "icalendar"])
`);
            onStatus('Loading the calendar script…');
            py.FS.mkdirTree('/planners');
            for (const name of SOURCES) {
                const res = await fetch('py/' + name);
                if (!res.ok) throw new Error(`Could not fetch ${name}`);
                py.FS.writeFile('/planners/' + name, await res.text());
            }
            await py.runPythonAsync(GLUE);
            return py;
        })();
        ready.catch(() => { ready = null; });
        return ready;
    }

    // The dates file calendar_print.py expects: `date | text` lines, then one
    // `### Name` + feed URL per uploaded calendar.
    function datesMarkdown(lines, files) {
        const out = ['# Dates', ''];
        for (const line of lines.split('\n')) {
            const t = line.trim();
            if (t) out.push(t);
        }
        files.forEach((f, i) => {
            out.push('', `### ${f.name}`, `${UPLOAD_URL}${i}.ics`);
        });
        return out.join('\n') + '\n';
    }

    async function generate(opts, onStatus) {
        const py = await init(onStatus);
        onStatus('Drawing…');
        const files = await Promise.all(opts.files.map(async f => ({
            name: f.name.replace(/\.ics$/i, '').replace(/[\r\n#]/g, ' ').trim() || 'Calendar',
            bytes: new Uint8Array(await f.arrayBuffer()),
        })));

        const setUploads = py.globals.get('set_uploads');
        setUploads(files.map((f, i) => [`${UPLOAD_URL}${i}.ics`, f.bytes]));
        setUploads.destroy();

        py.FS.writeFile('/tmp/dates.md', datesMarkdown(opts.dates, files));
        try { py.FS.unlink('/tmp/out.pdf'); } catch { /* first run */ }

        const call = opts.layout === 'overview'
            ? `cp.generate_yearview_pdf(${opts.year}, ${opts.month}, num_months=${opts.months}, output_path="/tmp/out.pdf", cols=${opts.cols})`
            : `cp.generate_calendar_pdf(${opts.year}, ${opts.month}, "/tmp/out.pdf", timeline_path=None, dates_md_path="/tmp/dates.md", sync=True)`;
        const log = [];
        py.setStdout({ batched: s => log.push(s) });
        await py.runPythonAsync(call);
        const warnings = log.filter(s => s.includes('Warning'));
        return { pdf: py.FS.readFile('/tmp/out.pdf'), warnings };
    }

    return { init, generate };
})();
