/* PDF drawing for the calendar — a port of calendar_print.py's reportlab code.
   pdf-lib uses the same coordinate system as reportlab (points, origin bottom
   left), so the geometry below follows the Python call for call through a
   small reportlab-shaped wrapper. */
import {
    PDFDocument, StandardFonts, clip, endPath, popGraphicsState, pushGraphicsState, rectangle, rgb,
    type PDFFont, type PDFPage,
} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { MONTHLY_QUOTES } from './data';
import { MONTH_NAMES, getWeeks, isoWeekForRow, monthRange, monthWeekRange, dateKey } from './dates';
import {
    astroFor, avgTemperature, calendarEventsFor, deadlinesFor, holidaysFor, parseDateLines,
    type CalEvent, type DateMap, type IcsFile, type RGB,
} from './events';

const MM = 72 / 25.4;
const A4_W = 595.2755905511812;
const A4_H = 841.8897637795277;
const A5_W = A4_W;
const A5_H = A4_H / 2;

const DAYS = ['月', '火', '水', '木', '金', '土', '日'];
const MARGIN = 10 * MM;
const HEADER_HEIGHT = 15 * MM;
const DAY_HEADER_HEIGHT = 8 * MM;
const STRIPE_COLOR: RGB = [0.85, 0.9, 1.0];
const STRIPE_COLOR_DARK: RGB = [0.45, 0.55, 0.8];

type FontName = 'Helvetica' | 'Helvetica-Bold' | 'Helvetica-Oblique' | 'Kanji';

/** Python's f"{x:.0f}": round half to even. */
function fmt0(x: number): string {
    const f = Math.floor(x);
    const diff = x - f;
    const n = Math.abs(diff - 0.5) < 1e-9 ? (f % 2 === 0 ? f : f + 1) : Math.round(x);
    return String(n === 0 ? 0 : n);
}

/** The subset of reportlab's Canvas that calendar_print.py uses. */
class Canvas {
    page!: PDFPage;
    private font!: PDFFont;
    private size = 10;
    private fill = rgb(0, 0, 0);
    private stroke = rgb(0, 0, 0);
    private lineWidth = 1;
    private dash: number[] | undefined;
    private charsets = new Map<PDFFont, Set<number>>();

    constructor(public doc: PDFDocument, private fonts: Record<FontName, PDFFont>) {
        this.showPage();
    }

    showPage() { this.page = this.doc.addPage([A4_W, A4_H]); }
    setFont(name: FontName, size: number) { this.font = this.fonts[name]; this.size = size; }
    setFillColorRGB(r: number, g: number, b: number) { this.fill = rgb(r, g, b); }
    setStrokeColorRGB(r: number, g: number, b: number) { this.stroke = rgb(r, g, b); }
    setLineWidth(w: number) { this.lineWidth = w; }
    setDash(on?: number, off?: number) { this.dash = on === undefined ? undefined : [on, off ?? on]; }

    /** Drops characters the standard fonts cannot encode (emoji, most non-Latin). */
    clean(text: string, font: PDFFont = this.font): string {
        if (font === this.fonts.Kanji) return text;
        let set = this.charsets.get(font);
        if (!set) this.charsets.set(font, set = new Set(font.getCharacterSet()));
        return [...text].filter(ch => set!.has(ch.codePointAt(0)!)).join('').replace(/\s+/g, ' ');
    }

    stringWidth(text: string, font: FontName, size: number): number {
        const f = this.fonts[font];
        return f.widthOfTextAtSize(this.clean(text, f), size);
    }

    drawString(x: number, y: number, text: string) {
        const t = this.clean(text);
        if (t) this.page.drawText(t, { x, y, size: this.size, font: this.font, color: this.fill });
    }

    drawCentredString(x: number, y: number, text: string) {
        const t = this.clean(text);
        this.drawString(x - this.font.widthOfTextAtSize(t, this.size) / 2, y, t);
    }

    rect(x: number, y: number, w: number, h: number, fill = 0, stroke = 1) {
        this.page.drawRectangle({
            x, y, width: w, height: h,
            color: fill ? this.fill : undefined,
            borderColor: stroke ? this.stroke : undefined,
            borderWidth: stroke ? this.lineWidth : 0,
            borderDashArray: stroke ? this.dash : undefined,
        });
    }

    line(x1: number, y1: number, x2: number, y2: number) {
        this.page.drawLine({
            start: { x: x1, y: y1 }, end: { x: x2, y: y2 },
            thickness: this.lineWidth, color: this.stroke, dashArray: this.dash,
        });
    }

    clipRect(x: number, y: number, w: number, h: number) {
        this.page.pushOperators(pushGraphicsState(), rectangle(x, y, w, h), clip(), endPath());
    }

    unclip() { this.page.pushOperators(popGraphicsState()); }
}

function fillRect(c: Canvas, x: number, y: number, w: number, h: number, color: RGB) {
    c.setFillColorRGB(...color);
    c.rect(x, y, w, h, 1, 0);
    c.setFillColorRGB(0, 0, 0);
}

interface MonthData {
    holidays: DateMap;
    deadlines: DateMap;
    astro: DateMap;
    calEvents: Map<string, CalEvent[]>;
}

function drawMonth(c: Canvas, xOff: number, yOff: number, year: number, month: number, data: MonthData,
    regionW = A5_W, regionH = A5_H, compact = false) {
    const { holidays, deadlines, astro, calEvents } = data;
    const usableW = regionW - 2 * MARGIN;
    const usableH = regionH - 2 * MARGIN;
    const innerX = xOff + MARGIN;
    const innerY = yOff + MARGIN;
    const topY = innerY + usableH;

    const weeks = getWeeks(year, month);
    const numRows = weeks.length;
    const wkColW = 8 * MM;
    const dayColW = (usableW - wkColW) / 7;

    // Month/year title with week range
    c.setFont('Helvetica-Bold', 14);
    const title = `${MONTH_NAMES[month - 1]} ${year}`;
    c.drawString(innerX + wkColW, topY - 7 * MM, title);
    const titleW = c.stringWidth(title, 'Helvetica-Bold', 14);
    c.setFont('Helvetica', 9);
    c.setFillColorRGB(0.4, 0.4, 0.4);
    c.drawString(innerX + wkColW + titleW + 3 * MM, topY - 7 * MM, monthWeekRange(year, month, weeks));
    c.setFillColorRGB(0, 0, 0);

    // Quote in italics below the title, word-wrapped
    const quote = compact ? '' : MONTHLY_QUOTES[month] ?? '';
    if (quote) {
        const size = 6;
        c.setFont('Helvetica-Oblique', size);
        c.setFillColorRGB(0.35, 0.35, 0.35);
        let qy = topY - 12 * MM;
        for (const ql of wrap(c, quote, 'Helvetica-Oblique', size, usableW - wkColW)) {
            c.drawString(innerX + wkColW, qy, ql);
            qy -= size + 1.5;
        }
        c.setFillColorRGB(0, 0, 0);
    }

    // Day-of-week header
    const tableTop = topY - HEADER_HEIGHT;
    const tableH = usableH - HEADER_HEIGHT;
    const rowH = (tableH - DAY_HEADER_HEIGHT) / numRows;
    const headerY = tableTop - DAY_HEADER_HEIGHT;
    fillRect(c, innerX, headerY, usableW, DAY_HEADER_HEIGHT, [0.85, 0.85, 0.85]);
    for (const col of [5, 6]) fillRect(c, innerX + wkColW + col * dayColW, headerY, dayColW, DAY_HEADER_HEIGHT, STRIPE_COLOR);
    c.setFont('Kanji', 9);
    c.drawCentredString(innerX + wkColW / 2, headerY + 2 * MM, '週');
    c.setFont('Kanji', 10);
    DAYS.forEach((name, i) => c.drawCentredString(innerX + wkColW + i * dayColW + dayColW / 2, headerY + 2 * MM, name));

    // Week rows
    const tableBottom = headerY - numRows * rowH;
    const box = 4 * MM;
    weeks.forEach((week, rowIdx) => {
        const rowTop = headerY - rowIdx * rowH;
        const rowBottom = rowTop - rowH;

        for (const col of [5, 6]) fillRect(c, innerX + wkColW + col * dayColW, rowBottom, dayColW, rowH, STRIPE_COLOR);
        week.forEach((d, col) => {
            if (col < 5 && d !== null && holidays.has(dateKey(year, month, d))) {
                fillRect(c, innerX + wkColW + col * dayColW, rowBottom, dayColW, rowH, STRIPE_COLOR);
            }
        });

        // Week and sprint number
        const wk = isoWeekForRow(year, month, week);
        const wkCx = innerX + wkColW / 2;
        const wkCy = rowTop - rowH / 2;
        c.setFont('Helvetica-Bold', 7);
        c.setFillColorRGB(0.4, 0.4, 0.4);
        c.drawCentredString(wkCx, wkCy + 1, String(wk));
        c.setFont('Helvetica', 5.5);
        c.drawCentredString(wkCx, wkCy - 6, `S${Math.floor(wk / 2)}`);
        c.setFillColorRGB(0, 0, 0);

        week.forEach((dayNum, col) => {
            if (dayNum === null) return;
            const cellX = innerX + wkColW + col * dayColW;
            const boxX = cellX + dayColW - box - 1;
            const boxY = rowTop - box - 1;
            const capHeight = 7 * 0.72;

            if (compact) {
                c.setFont('Helvetica', 7);
                c.drawCentredString(boxX + box / 2, boxY + (box - capHeight) / 2, String(dayNum));
                return;
            }

            fillRect(c, boxX, boxY, box, box, [1, 1, 1]);
            const key = dateKey(year, month, dayNum);
            const isWeekend = col >= 5;
            const isHoliday = holidays.has(key);
            if (isWeekend || isHoliday) {
                // Thick blue border on weekend/holiday date boxes, clipped to the cell
                const bw = 1.5;
                c.clipRect(cellX, rowBottom, dayColW, rowH);
                fillRect(c, boxX - bw, boxY - bw, box + 2 * bw, box + 2 * bw, STRIPE_COLOR_DARK);
                fillRect(c, boxX, boxY, box, box, [1, 1, 1]);
                c.unclip();
            } else {
                c.setLineWidth(0.8);
                c.setStrokeColorRGB(0.8, 0, 0);
                c.rect(boxX, boxY, box, box);
                c.setStrokeColorRGB(0, 0, 0);
            }

            c.setFont('Helvetica', 7);
            c.drawCentredString(boxX + box / 2, boxY + (box - capHeight) / 2, String(dayNum));

            // Average temperature, top left
            c.setFont('Helvetica', 6);
            c.setFillColorRGB(0.4, 0.4, 0.4);
            c.drawString(cellX + 1.5, rowTop - 7, `${fmt0(avgTemperature(month, dayNum))}°`);
            c.setFillColorRGB(0, 0, 0);

            // Info text stacked below the day box
            const info: [string, RGB][] = [];
            if (isHoliday) info.push([holidays.get(key)!, [0.4, 0.4, 0.4]]);
            if (deadlines.has(key)) info.push([deadlines.get(key)!, [0.7, 0.15, 0]]);
            if (astro.has(key)) info.push([astro.get(key)!, [0.4, 0.1, 0.5]]);
            for (const [, text, color] of calEvents.get(key) ?? []) info.push([text, color]);

            const font: FontName = 'Helvetica';
            const size = 5;
            const lineStep = 6.5;
            const maxW = dayColW - 3;
            const lines: [string, RGB, number][] = [];
            for (const [raw, color] of info) {
                const text = c.clean(raw);
                // Continuation lines indent past an "HH:MM " or "X: [HH:MM ]" prefix
                let indent = 0;
                if (text.length > 6 && text[2] === ':' && text[5] === ' ') {
                    indent = c.stringWidth(text.slice(0, 6), font, size);
                } else if (text.length > 3 && text[1] === ':' && text[2] === ' ') {
                    const rest = text.slice(3);
                    const end = rest.length > 6 && rest[2] === ':' && rest[5] === ' ' ? 9 : 3;
                    indent = c.stringWidth(text.slice(0, end), font, size);
                }
                let cur = '';
                let first = true;
                for (const w of text.split(/\s+/).filter(Boolean)) {
                    const trial = cur ? `${cur} ${w}` : w;
                    if (c.stringWidth(trial, font, size) <= (first ? maxW : maxW - indent)) {
                        cur = trial;
                    } else {
                        if (cur) { lines.push([cur, color, first ? 0 : indent]); first = false; }
                        cur = w;
                    }
                }
                if (cur) lines.push([cur, color, first ? 0 : indent]);
            }

            const textTop = rowTop - box - 2;
            if ((isWeekend || isHoliday) && lines.length) {
                // White backing so text reads on tinted cells
                const firstY = textTop - lineStep;
                const lastY = Math.max(textTop - lines.length * lineStep, rowBottom);
                fillRect(c, cellX + 1, lastY - 1, dayColW - 2, firstY - lastY + lineStep + 2, [1, 1, 1]);
            }
            c.setFont(font, size);
            for (let i = 0; i < lines.length; i++) {
                const y = textTop - (i + 1) * lineStep;
                if (y < rowBottom) break;
                const [text, color, x] = lines[i];
                c.setFillColorRGB(...color);
                c.drawString(cellX + 1.5 + x, y, text);
            }
            c.setFillColorRGB(0, 0, 0);
        });
    });

    // Grid on top
    c.setLineWidth(0.8);
    c.line(innerX, headerY, innerX + usableW, headerY);
    c.setLineWidth(0.3);
    for (let r = 0; r < numRows; r++) {
        const y = headerY - (r + 1) * rowH;
        c.line(innerX, y, innerX + usableW, y);
    }
    c.line(innerX + wkColW, tableTop, innerX + wkColW, tableBottom);
    for (let i = 1; i < 7; i++) {
        const x = innerX + wkColW + i * dayColW;
        c.line(x, tableTop, x, tableBottom);
    }
    c.setLineWidth(1);
    c.rect(innerX, tableBottom, usableW, tableTop - tableBottom);
}

function wrap(c: Canvas, text: string, font: FontName, size: number, maxW: number): string[] {
    const out: string[] = [];
    let cur = '';
    for (const w of text.split(/\s+/).filter(Boolean)) {
        const trial = cur ? `${cur} ${w}` : w;
        if (c.stringWidth(trial, font, size) <= maxW) cur = trial;
        else { if (cur) out.push(cur); cur = w; }
    }
    if (cur) out.push(cur);
    return out;
}

function drawNotesPanel(c: Canvas, xOff: number, yOff: number, regionW: number, regionH: number) {
    const innerX = xOff + MARGIN;
    const innerY = yOff + MARGIN;
    const usableW = regionW - 2 * MARGIN;
    const usableH = regionH - 2 * MARGIN;
    const gap = 6 * MM;
    const spacing = 8 * MM;
    const titleArea = 7 * MM;
    const upcomingLines = 4;
    const upcomingH = titleArea + upcomingLines * spacing;
    const notesH = usableH - gap - upcomingH;

    const notesY = innerY + upcomingH + gap;
    c.setFont('Helvetica-Bold', 11);
    c.drawString(innerX, notesY + notesH - 4 * MM, 'Notes');
    c.setLineWidth(0.3);
    c.setStrokeColorRGB(0.7, 0.7, 0.7);
    for (let y = notesY + notesH - titleArea - spacing; y > notesY + 2; y -= spacing) {
        c.line(innerX, y, innerX + usableW, y);
    }
    c.setStrokeColorRGB(0, 0, 0);

    c.setFont('Helvetica-Bold', 11);
    c.drawString(innerX, innerY + upcomingH - 4 * MM, 'Upcoming');
    c.setStrokeColorRGB(0.7, 0.7, 0.7);
    for (let n = 1; n <= upcomingLines; n++) {
        const y = innerY + upcomingH - titleArea - n * spacing;
        c.line(innerX, y, innerX + usableW, y);
    }
    c.setStrokeColorRGB(0, 0, 0);
}

function drawMiniMonth(c: Canvas, xOff: number, yOff: number, regionW: number, regionH: number,
    year: number, month: number, holidays: DateMap) {
    const m = 3 * MM;
    const innerX = xOff + m;
    const innerY = yOff + m;
    const usableW = regionW - 2 * m;
    const usableH = regionH - 2 * m;
    const topY = innerY + usableH;
    const weeks = getWeeks(year, month);
    const numRows = weeks.length;
    const wkColW = 6 * MM;
    const dayColW = (usableW - wkColW) / 7;

    const titleH = 5.5 * MM;
    const title = `${MONTH_NAMES[month - 1]} ${year}`;
    c.setFont('Helvetica-Bold', 9);
    c.drawString(innerX + wkColW, topY - 4 * MM, title);
    const titleW = c.stringWidth(title, 'Helvetica-Bold', 9);
    c.setFont('Helvetica', 6);
    c.setFillColorRGB(0.4, 0.4, 0.4);
    c.drawString(innerX + wkColW + titleW + 2 * MM, topY - 4 * MM, monthWeekRange(year, month, weeks));
    c.setFillColorRGB(0, 0, 0);

    const headH = 4 * MM;
    const headerY = topY - titleH - headH;
    fillRect(c, innerX, headerY, usableW, headH, [0.85, 0.85, 0.85]);
    for (const col of [5, 6]) fillRect(c, innerX + wkColW + col * dayColW, headerY, dayColW, headH, STRIPE_COLOR);
    c.setFont('Kanji', 6);
    c.drawCentredString(innerX + wkColW / 2, headerY + 1.2 * MM, '週');
    c.setFont('Kanji', 7);
    DAYS.forEach((name, i) => c.drawCentredString(innerX + wkColW + i * dayColW + dayColW / 2, headerY + 1.2 * MM, name));

    const rowH = (headerY - innerY) / numRows;
    const tableBottom = headerY - numRows * rowH;
    weeks.forEach((week, r) => {
        const rowTop = headerY - r * rowH;
        const rowBottom = rowTop - rowH;
        for (const col of [5, 6]) fillRect(c, innerX + wkColW + col * dayColW, rowBottom, dayColW, rowH, STRIPE_COLOR);
        week.forEach((d, col) => {
            if (col < 5 && d !== null && holidays.has(dateKey(year, month, d))) {
                fillRect(c, innerX + wkColW + col * dayColW, rowBottom, dayColW, rowH, STRIPE_COLOR);
            }
        });
        c.setFont('Helvetica-Bold', 6);
        c.setFillColorRGB(0.4, 0.4, 0.4);
        c.drawCentredString(innerX + wkColW / 2, rowTop - rowH / 2 - 2, String(isoWeekForRow(year, month, week)));
        c.setFillColorRGB(0, 0, 0);
        c.setFont('Helvetica', 7.5);
        week.forEach((d, col) => {
            if (d !== null) c.drawCentredString(innerX + wkColW + col * dayColW + dayColW / 2, rowTop - rowH / 2 - 2.5, String(d));
        });
    });

    c.setLineWidth(0.25);
    for (let r = 0; r <= numRows; r++) c.line(innerX, headerY - r * rowH, innerX + usableW, headerY - r * rowH);
    c.line(innerX + wkColW, headerY + headH, innerX + wkColW, tableBottom);
    for (let i = 1; i <= 7; i++) {
        const x = innerX + wkColW + i * dayColW;
        c.line(x, headerY + headH, x, tableBottom);
    }
    c.setLineWidth(0.5);
    c.line(innerX, headerY, innerX + usableW, headerY);
    c.setLineWidth(0.7);
    c.rect(innerX, tableBottom, usableW, headerY + headH - tableBottom);
}

/* --- Documents -------------------------------------------------------- */

let kanjiBytes: Promise<ArrayBuffer> | null = null;

async function newCanvas(title: string): Promise<Canvas> {
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    // Noto Sans CJK JP Medium (OFL), subset to 月火水木金土日週 with pyftsubset, then converted to TrueType outlines (pdf-lib mislabels embedded CFF).
    kanjiBytes ??= fetch(`${import.meta.env.BASE_URL}fonts/kanji-subset.ttf`).then(r => {
        if (!r.ok) throw new Error('Could not load the kanji font');
        return r.arrayBuffer();
    });
    const [helv, bold, oblique, kanji] = await Promise.all([
        doc.embedFont(StandardFonts.Helvetica),
        doc.embedFont(StandardFonts.HelveticaBold),
        doc.embedFont(StandardFonts.HelveticaOblique),
        kanjiBytes.then(b => doc.embedFont(b)),
    ]);
    doc.setTitle(title);
    doc.setCreator('bang-labs.eu/planners');
    return new Canvas(doc, { Helvetica: helv, 'Helvetica-Bold': bold, 'Helvetica-Oblique': oblique, Kanji: kanji });
}

function dashedSeparator(c: Canvas) {
    c.setLineWidth(0.5);
    c.setDash(4, 4);
    c.setStrokeColorRGB(0.6, 0.6, 0.6);
    c.line(0, A5_H, A4_W, A5_H);
    c.setDash();
    c.setStrokeColorRGB(0, 0, 0);
}

export interface FourMonthOptions { year: number; month: number; dates: string; files: IcsFile[] }

/** Four months on two A4 sheets: two A5 months, then one A5 month, a compact month and notes. */
export async function fourMonthPdf({ year, month, dates, files }: FourMonthOptions): Promise<Uint8Array> {
    const months = monthRange(year, month, 4);
    const deadlines = deadlinesFor(months);
    for (const [k, v] of parseDateLines(dates, months)) deadlines.set(k, v);
    const data: MonthData = {
        holidays: holidaysFor(months),
        deadlines,
        astro: astroFor(months),
        calEvents: calendarEventsFor(files, months),
    };
    const [first, , , last] = months;
    const c = await newCanvas(`Calendar ${MONTH_NAMES[first[1] - 1]}–${MONTH_NAMES[last[1] - 1]} ${first[0]}`);

    drawMonth(c, 0, A5_H, ...months[0], data);
    drawMonth(c, 0, 0, ...months[1], data);
    dashedSeparator(c);

    c.showPage();
    drawMonth(c, 0, A5_H, ...months[2], data);
    drawMonth(c, 0, 0, ...months[3], data, A5_W / 2, A5_H, true);
    drawNotesPanel(c, A5_W / 2, 0, A5_W / 2, A5_H);
    dashedSeparator(c);

    return c.doc.save();
}

export interface OverviewOptions { year: number; month: number; months: number; cols: number }

/** `months` small months in a `cols`-wide grid on one A4 page. */
export async function overviewPdf({ year, month, months: count, cols }: OverviewOptions): Promise<Uint8Array> {
    const months = monthRange(year, month, count);
    const holidays = holidaysFor(months);
    const rows = Math.ceil(count / cols);
    const cellW = A4_W / cols;
    const cellH = A4_H / rows;
    const [fy, fm] = months[0];
    const [ly, lm] = months[months.length - 1];
    const c = await newCanvas(`Calendar ${MONTH_NAMES[fm - 1]} ${fy}–${MONTH_NAMES[lm - 1]} ${ly}`);

    months.forEach(([y, m], i) => {
        drawMiniMonth(c, (i % cols) * cellW, A4_H - (Math.floor(i / cols) + 1) * cellH, cellW, cellH, y, m, holidays);
    });

    c.setLineWidth(0.3);
    c.setDash(2, 3);
    c.setStrokeColorRGB(0.7, 0.7, 0.7);
    for (let r = 1; r < rows; r++) c.line(0, A4_H - r * cellH, A4_W, A4_H - r * cellH);
    for (let i = 1; i < cols; i++) c.line(i * cellW, 0, i * cellW, A4_H);
    return c.doc.save();
}
