/* Day planners — HTML ports of Planners/day-planner/*.tex.
 *
 * Each layout returns a list of `.sheet` elements sized in millimetres, so the
 * same markup is the on-screen preview and the printed page. The glyph maths
 * follows schedule.lua / solo-schedule.lua, generalised from a whole-hour
 * \utcoffset to any offset in minutes.
 */
const DayPlanner = (() => {
    // GlyphClock order, index 0 starting at 00:00 UTC. Files are GlyphClock's own art.
    const GLYPHS = [
        'croissant', 'butterfly', 'tulip', 'umbrella',
        'cactus', 'balloon', 'glasses', 'anchor',
        'peacock', 'robot', 'star', 'cloud',
        'tree', 'kite', 'chair', 'recycle',
    ];
    const BLOCK = 90;
    const DAY = 1440;
    const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const mod = (n, m) => ((n % m) + m) % m;
    const hhmm = mins => {
        const m = mod(Math.round(mins), DAY);
        return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
    };

    function el(tag, cls, html) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (html !== undefined) e.innerHTML = html;
        return e;
    }

    function glyph(idx, cls = 'glyph') {
        const img = el('img', cls);
        img.src = `emoji/${GLYPHS[idx]}.svg`;
        img.alt = GLYPHS[idx];
        return img;
    }

    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const dateRow = (from = 1, to = 31) =>
        Array.from({ length: to - from + 1 }, (_, i) => `<span>${from + i}</span>`).join('');
    const weekdayRow = () => WEEKDAYS.map(d => `<span>${d}</span>`).join('');
    const rules = n => Array.from({ length: n }, () => '<i></i>').join('');

    /* --- Time zone ------------------------------------------------------- */

    // Minutes east of UTC for `tz` at local noon on `isoDate`.
    function utcOffset(tz, isoDate) {
        const [y, m, d] = isoDate.split('-').map(Number);
        const at = new Date(Date.UTC(y, m - 1, d, 12));
        const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
            timeZone: tz, hourCycle: 'h23',
            year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric',
        }).formatToParts(at).map(p => [p.type, p.value]));
        const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
        return Math.round((asUtc - at.getTime()) / 60000);
    }

    function offsetLabel(off) {
        const sign = off < 0 ? '−' : '+';
        const a = Math.abs(off);
        return `UTC${sign}${Math.floor(a / 60)}${a % 60 ? ':' + String(a % 60).padStart(2, '0') : ''}`;
    }

    /* --- Schedules ------------------------------------------------------- */

    // 30-minute rows from startH:00 to endH:00 inclusive, grouped into glyph blocks (schedule.lua).
    function halfHourRows(startH, endH, offset) {
        const rows = [];
        for (let mins = startH * 60; mins <= endH * 60; mins += 30) {
            rows.push({ time: hhmm(mins), block: Math.min(Math.floor(mod(mins - offset, DAY) / BLOCK), 15) });
        }
        // Rowspan per block and alternating block shade (first block white).
        let n = 0;
        rows.forEach((r, i) => {
            if (i === 0 || rows[i - 1].block !== r.block) {
                n++;
                r.span = rows.slice(i).findIndex(x => x.block !== r.block);
                if (r.span === -1) r.span = rows.length - i;
                r.shade = n % 2 === 0;
            }
        });
        return rows;
    }

    // `count` consecutive glyph blocks, the first being the earliest that starts
    // at or after `fromMins` local time (solo-schedule.lua, with a fixed row count
    // so the folded layouts fill their panels in every time zone).
    function blockRows(fromMins, count, offset, skip = 0) {
        const first = Math.ceil(mod(fromMins - offset, DAY) / BLOCK) + skip;
        return Array.from({ length: count }, (_, i) => {
            const block = mod(first + i, 16);
            return { block, time: hhmm(block * BLOCK + offset) };
        });
    }

    function halfHourTable(rows, cols) {
        // cols: [{label, cls}] for the writing/priority columns after glyph + time
        const t = el('table', 'sched sched--half');
        const head = t.createTHead().insertRow();
        head.innerHTML = '<th class="c-glyph"></th><th class="c-time"></th>' +
            cols.map(c => `<th class="${c.cls}">${c.label ? esc(c.label) : ''}</th>`).join('');
        const body = t.createTBody();
        rows.forEach((r, i) => {
            const tr = body.insertRow();
            if (i % 2 === 0) tr.className = 'shade';
            if (r.span) {
                const td = tr.insertCell();
                td.className = 'c-glyph' + (r.shade ? ' shade' : ' plain');
                td.rowSpan = r.span;
                td.appendChild(glyph(r.block));
            }
            tr.insertAdjacentHTML('beforeend', `<td class="c-time">${r.time}</td>` +
                cols.map(c => `<td class="${c.cls}">${c.cls.includes('c-pri') ? '<b class="pri"></b>' : ''}</td>`).join(''));
        });
        return t;
    }

    function blockTable(rows, writeCols) {
        const t = el('table', 'sched sched--block');
        const body = t.createTBody();
        rows.forEach((r, i) => {
            const tr = body.insertRow();
            if (i % 2 === 0) tr.className = 'shade';
            const td = tr.insertCell();
            td.className = 'c-stack';
            td.appendChild(glyph(r.block));
            td.insertAdjacentHTML('beforeend', `<span>${r.time}</span>`);
            for (let c = 0; c < writeCols; c++) tr.insertCell().className = 'c-write';
        });
        return t;
    }

    /* --- Shared building blocks ----------------------------------------- */

    function ruledBox(title, n, cls = '') {
        return `<div class="box ${cls}"><h3>${title}</h3><div class="rules">${rules(n)}</div></div>`;
    }

    function barBox(title, n, cls = '') {
        return `<div class="bar-box ${cls}"><h4>${title}</h4><div class="rules">${rules(n)}</div></div>`;
    }

    const nameBlank = name => name ? esc(name) : '<span class="blank"></span>';

    /* --- Layouts ---------------------------------------------------------- */

    function shared(o) {
        const sheets = [];
        for (let p = 0; p < o.pages; p++) {
            const s = el('div', 'sheet sheet--a4p layout-a4');
            s.innerHTML = `
                <header class="a4-head">
                    <h2>${esc(o.title)}</h2>
                    <div class="spread">${dateRow()}</div>
                    <div class="spread spread--days">${weekdayRow()}</div>
                </header>
                <div class="pair">
                    ${ruledBox(`${nameBlank(o.personL)}’s Goal`, 3)}
                    ${ruledBox(`${nameBlank(o.personR)}’s Goal`, 3)}
                </div>`;
            const wrap = el('div', 'sched-wrap');
            wrap.appendChild(halfHourTable(halfHourRows(o.startHour, o.endHour, o.offset), [
                { cls: 'c-pri c-dash' },
                { cls: 'c-write c-name', label: o.personL },
                { cls: 'c-shared c-dash c-name', label: 'Shared' },
                { cls: 'c-write c-dash c-name c-right', label: o.personR },
                { cls: 'c-pri' },
            ]));
            s.appendChild(wrap);
            s.insertAdjacentHTML('beforeend', `<div class="pair pair--foot">${ruledBox('Notes', 3)}${ruledBox('Upcoming', 3)}</div>`);
            sheets.push(s);
        }
        return sheets;
    }

    function solo(o) {
        const sheets = [];
        for (let p = 0; p < o.pages; p++) {
            const s = el('div', 'sheet sheet--a4p layout-a4');
            s.innerHTML = `
                <header class="a4-head">
                    <h2>${esc(o.title)}</h2>
                    <div class="spread spread--days">${weekdayRow()}</div>
                    <div class="spread">${dateRow()}</div>
                </header>
                ${ruledBox('Goal', 2, 'box--solo')}`;
            const wrap = el('div', 'sched-wrap');
            wrap.appendChild(halfHourTable(halfHourRows(o.startHour, o.endHour, o.offset), [
                { cls: 'c-pri c-dash' },
                { cls: 'c-write c-name', label: 'Plan' },
                { cls: 'c-write c-dash c-name c-right', label: 'Actual' },
            ]));
            s.appendChild(wrap);
            s.insertAdjacentHTML('beforeend', `<div class="pair pair--foot">${ruledBox('Notes', 3)}${ruledBox('Upcoming', 3)}</div>`);
            sheets.push(s);
        }
        return sheets;
    }

    const FOLD_GUIDES = `
        <div class="guide guide--v1"></div>
        <div class="guide guide--h"></div>
        <div class="guide guide--v3 guide--q1"></div>
        <div class="guide guide--v3 guide--q3"></div>`;

    // solo-planner-page.tex: 4x2 A7 cells on A4 landscape.
    function fold(o) {
        const am = blockRows(o.dayStart, 5, o.offset);
        const pm = blockRows(o.dayStart, 6, o.offset, 5);
        const sheets = [];
        for (let p = 0; p < o.pages; p++) {
            const s = el('div', 'sheet sheet--a4l layout-fold');
            s.innerHTML = FOLD_GUIDES;
            const amCell = el('div', 'cell cell--wide cell--tl');
            amCell.appendChild(blockTable(am, 2));
            const pmCell = el('div', 'cell cell--wide cell--bl');
            pmCell.appendChild(blockTable(pm, 2));
            s.append(amCell, pmCell);
            s.insertAdjacentHTML('beforeend', `
                <div class="cell cell--c3 cell--top"><div class="rules rules--loose">${rules(13)}</div></div>
                <div class="cell cell--c3 cell--bottom"><div class="rules rules--loose">${rules(13)}</div></div>
                <div class="cell cell--c4 cell--top">
                    <div class="mini-dates">
                        <div class="spread">${dateRow(1, 16)}</div>
                        <div class="spread">${dateRow(17, 31)}</div>
                        <div class="spread spread--days">${weekdayRow()}</div>
                    </div>
                    ${barBox('Goal', 8, 'bar-box--loose')}
                </div>
                <div class="cell cell--c4 cell--bottom">${barBox('Notes', 11)}</div>`);
            sheets.push(s);
        }
        return sheets;
    }

    // 3day-planner-*.tex: side A holds days 1–2, side B day 3 between four A7 corners.
    function three(o) {
        const rows = blockRows(o.dayStart, 11, o.offset);
        const panel = pos => {
            const d = el('div', `panel panel--${pos}`);
            d.innerHTML = `
                <div class="panel__head">
                    <div class="mini-dates">
                        <div class="spread">${dateRow()}</div>
                        <div class="spread spread--days">${weekdayRow()}</div>
                    </div>
                    <div class="today"><span>Today I</span><div class="rules">${rules(3)}</div></div>
                </div>`;
            d.appendChild(blockTable(rows, 1));
            return d;
        };
        const a = el('div', 'sheet sheet--a4l layout-three');
        a.append(panel('left'), panel('right'));
        const b = el('div', 'sheet sheet--a4l layout-three');
        b.insertAdjacentHTML('beforeend', `
            <div class="corner corner--tl">${barBox('Notes', 11)}</div>
            <div class="corner corner--tr">${barBox('Goal', 11)}</div>
            <div class="corner corner--bl">${barBox('Notes', 11)}</div>
            <div class="corner corner--br">${barBox('Notes', 11)}</div>`);
        b.appendChild(panel('center'));
        return [a, b];
    }

    const LAYOUTS = {
        shared: { render: shared, orientation: 'portrait', title: 'Shared Day Plan' },
        solo: { render: solo, orientation: 'portrait', title: 'Day Plan' },
        fold: { render: fold, orientation: 'landscape', title: 'Day Plan' },
        three: { render: three, orientation: 'landscape', title: '3-Day Plan' },
    };

    return { LAYOUTS, utcOffset, offsetLabel, hhmm };
})();
