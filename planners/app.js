/* Page wiring: tabs, the day-planner form and preview, the calendar form. */
(() => {
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

    const STORE = 'planners:v1';
    const saved = (() => {
        try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; }
    })();
    const remember = patch => {
        Object.assign(saved, patch);
        try { localStorage.setItem(STORE, JSON.stringify(saved)); } catch { /* private mode */ }
    };

    const todayIso = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    // Show only the fields whose data-for lists the current variant.
    function showFieldsFor(form, value) {
        $$('[data-for]', form).forEach(f => { f.hidden = !f.dataset.for.split(' ').includes(value); });
    }

    /* --- Tabs ------------------------------------------------------------ */

    function selectTab(name) {
        $$('.tabs__tab').forEach(t => t.setAttribute('aria-selected', String(t.dataset.tab === name)));
        $('#tool-day').hidden = name !== 'day';
        $('#tool-calendar').hidden = name !== 'calendar';
        $('#about-glyphs').hidden = name !== 'day';
        if (name === 'day') renderDay();
    }
    $$('.tabs__tab').forEach(t => t.addEventListener('click', () => {
        history.replaceState(null, '', t.dataset.tab === 'day' ? location.pathname : '#calendar');
        selectTab(t.dataset.tab);
    }));

    /* --- Day planners ---------------------------------------------------- */

    const dayForm = $('#day-form');
    const preview = $('#day-preview');
    const { LAYOUTS, utcOffset, offsetLabel, hhmm } = DayPlanner;

    function fillSelect(select, values, label) {
        select.innerHTML = values.map(v => `<option value="${v}">${label(v)}</option>`).join('');
    }

    const zones = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
    const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Copenhagen';
    if (!zones.includes(localZone)) zones.unshift(localZone);
    if (!zones.includes('UTC')) zones.unshift('UTC');
    fillSelect($('#tz'), zones, z => z.replace(/_/g, ' '));
    fillSelect(dayForm.startHour, [...Array(13).keys()].map(h => h + 4), h => `${String(h).padStart(2, '0')}:00`);
    fillSelect(dayForm.endHour, [...Array(10).keys()].map(h => h + 15), h => `${String(h).padStart(2, '0')}:00`);
    fillSelect(dayForm.dayStart, [...Array(9).keys()].map(i => 240 + i * 30), m => `from ${hhmm(m)}`);

    // Restore the last settings, defaulting to the LaTeX sources' values.
    dayForm.tz.value = zones.includes(saved.tz) ? saved.tz : localZone;
    dayForm.date.value = todayIso();
    dayForm.startHour.value = saved.startHour ?? 7;
    dayForm.endHour.value = saved.endHour ?? 22;
    dayForm.dayStart.value = saved.dayStart ?? 390;
    dayForm.pages.value = saved.pages ?? 2;
    dayForm.personL.value = saved.personL ?? '';
    dayForm.personR.value = saved.personR ?? '';
    if (saved.variant && LAYOUTS[saved.variant]) dayForm.variant.value = saved.variant;
    const titles = Object.assign({}, saved.titles);

    let lastVariant = null;
    function readDay() {
        const variant = dayForm.variant.value;
        const layout = LAYOUTS[variant];
        if (variant !== lastVariant) {
            dayForm.title.value = titles[variant] ?? layout.title;
            lastVariant = variant;
        }
        const offset = utcOffset(dayForm.tz.value, dayForm.date.value || todayIso());
        let startHour = +dayForm.startHour.value;
        let endHour = +dayForm.endHour.value;
        if (endHour <= startHour) endHour = startHour + 1;
        return {
            variant, layout, offset, startHour, endHour,
            title: dayForm.title.value.trim(),
            personL: dayForm.personL.value.trim(),
            personR: dayForm.personR.value.trim(),
            dayStart: +dayForm.dayStart.value,
            pages: Math.max(1, Math.min(31, +dayForm.pages.value || 1)),
        };
    }

    function tzNote(o) {
        const tz = dayForm.tz.value;
        const date = dayForm.date.value || todayIso();
        const year = +date.slice(0, 4);
        const jan = utcOffset(tz, `${year}-01-15`);
        const jul = utcOffset(tz, `${year}-07-15`);
        let note = `${offsetLabel(o.offset)} on that date.`;
        if (jan !== jul) {
            note += ` This zone also uses ${offsetLabel(o.offset === jan ? jul : jan)} part of the year, which moves every glyph — print a new set when the clocks change.`;
        }
        $('#tz-note').textContent = note;
    }

    function scalePreview() {
        const avail = preview.clientWidth;
        $$('.sheet-frame', preview).forEach(frame => {
            const sheet = frame.firstElementChild;
            const scale = Math.min(1, avail / sheet.offsetWidth);
            sheet.style.transform = `scale(${scale})`;
            frame.style.width = `${sheet.offsetWidth * scale}px`;
            frame.style.height = `${sheet.offsetHeight * scale}px`;
        });
    }

    function renderDay() {
        if ($('#tool-day').hidden) return;
        const o = readDay();
        showFieldsFor(dayForm, o.variant);
        tzNote(o);
        $('#page-size').textContent = `@page { size: A4 ${o.layout.orientation}; margin: 0; }`;
        $('#print-hint').textContent = o.variant === 'three'
            ? 'Print both sides at 100% scale with no margins, flipping on the short edge. Choose “Save as PDF” to keep a file.'
            : 'Print at 100% scale with no margins. In the dialog, choose “Save as PDF” to keep a file.';
        preview.replaceChildren(...o.layout.render(o).map(sheet => {
            const frame = document.createElement('div');
            frame.className = 'sheet-frame';
            frame.appendChild(sheet);
            return frame;
        }));
        scalePreview();
        remember({
            variant: o.variant, tz: dayForm.tz.value, startHour: o.startHour, endHour: o.endHour,
            dayStart: o.dayStart, pages: o.pages, personL: o.personL, personR: o.personR,
        });
    }

    dayForm.addEventListener('input', e => {
        if (e.target.name === 'title') {
            titles[dayForm.variant.value] = e.target.value;
            remember({ titles });
        }
        renderDay();
    });
    dayForm.addEventListener('submit', e => e.preventDefault());
    new ResizeObserver(scalePreview).observe(preview);
    // Ctrl+P prints the planner too, as long as its tab is showing.
    $('#print-day').addEventListener('click', () => window.print());
    window.addEventListener('beforeprint', () => {
        document.body.classList.toggle('printing-day', !$('#tool-day').hidden);
    });
    window.addEventListener('afterprint', () => document.body.classList.remove('printing-day'));

    /* --- Calendar -------------------------------------------------------- */

    const calForm = $('#cal-form');
    const status = $('#cal-status');
    const download = $('#cal-download');
    const now = new Date();
    calForm.start.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    calForm.dates.value = saved.calDates ?? '';
    let pdfUrl = null;

    const syncCalFields = () => showFieldsFor(calForm, calForm.layout.value);
    calForm.addEventListener('input', e => {
        syncCalFields();
        if (e.target.name === 'dates') remember({ calDates: e.target.value });
    });
    syncCalFields();

    calForm.addEventListener('submit', async e => {
        e.preventDefault();
        const button = $('#cal-generate');
        const [year, month] = calForm.start.value.split('-').map(Number);
        if (!year || !month) return;
        const opts = {
            layout: calForm.layout.value, year, month,
            months: Math.max(2, Math.min(12, +calForm.months.value || 8)),
            cols: Math.max(1, Math.min(3, +calForm.cols.value || 2)),
            dates: calForm.dates.value,
            files: [...calForm.ics.files],
        };
        button.disabled = true;
        status.classList.remove('is-error');
        try {
            const { pdf, warnings } = await CalendarTool.generate(opts, msg => { status.textContent = msg; });
            if (pdfUrl) URL.revokeObjectURL(pdfUrl);
            pdfUrl = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }));
            $('#cal-frame').src = pdfUrl;
            $('#cal-preview').hidden = false;
            download.href = pdfUrl;
            download.download = opts.layout === 'overview'
                ? `calendar_overview_${year}_${String(month).padStart(2, '0')}.pdf`
                : `calendar_${year}_${String(month).padStart(2, '0')}.pdf`;
            download.hidden = false;
            status.textContent = warnings.length
                ? `Done, but some calendar files could not be read: ${warnings.join(' ')}`
                : 'Done. Print at 100% scale, A4.';
        } catch (err) {
            console.error(err);
            status.textContent = `Could not generate the calendar: ${err.message.split('\n').filter(Boolean).pop()}`;
            status.classList.add('is-error');
        } finally {
            button.disabled = false;
        }
    });

    /* --- Start ----------------------------------------------------------- */

    selectTab(location.hash === '#calendar' ? 'calendar' : 'day');
    window.addEventListener('hashchange', () => selectTab(location.hash === '#calendar' ? 'calendar' : 'day'));
})();
