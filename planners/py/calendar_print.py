#!/usr/bin/env python3
"""Generate a monthly calendar PDF with 4 months on 2 A4 sheets (A5 per month).

Week starts on Monday, ends on Sunday (ISO standard). Includes ISO week numbers.
"""

import calendar
import datetime
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

from icalendar import Calendar as ICalendar

from astro_events import get_all_astro_events_for_months
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.pdfgen import canvas

# Register a CJK font for Japanese kanji
pdfmetrics.registerFont(UnicodeCIDFont("HeiseiKakuGo-W5"))


# A4 dimensions
A4_W, A4_H = A4  # 595.27, 841.89 points

# A5 = half of A4 (split horizontally)
A5_W = A4_W
A5_H = A4_H / 2

DAYS = ["\u6708", "\u706b", "\u6c34", "\u6728", "\u91d1", "\u571f", "\u65e5"]
MARGIN = 10 * mm
HEADER_HEIGHT = 15 * mm  # space for month name + quote
DAY_HEADER_HEIGHT = 8 * mm

# --- Monthly quotes (one per calendar month) ---
MONTHLY_QUOTES: dict[int, str] = {
    1:  "\u201cA bad system will beat a good person every time.\u201d \u2014 W. E. Deming",
    2:  "\u201cI have made this longer because I have not had time to make it shorter.\u201d \u2014 Pascal",
    3:  "\u201cA man sees in the world what he carries in his heart.\u201d \u2014 Goethe",
    4:  "\u201cWe can\u2019t control systems or figure them out. But we can dance with them.\u201d \u2014 Donella Meadows",
    5:  "\u201cThe most certain sign of wisdom is cheerfulness.\u201d \u2014 Montaigne",
    6:  "\u201cThe best way to predict the future is to create it.\u201d \u2014 Peter Drucker",
    7:  "\u201cTrue eloquence consists in saying all that is necessary, and nothing but what is necessary.\u201d \u2014 La Rochefoucauld",
    8:  "\u201cThe purpose of a system is what it does.\u201d \u2014 Stafford Beer",
    9:  "\u201cThe righter we do the wrong thing, the wronger we become.\u201d \u2014 Russell Ackoff",
    10: "\u201cAll of man\u2019s problems stem from his inability to sit quietly in a room alone.\u201d \u2014 Pascal",
    11: "\u201cKnowing is not enough; we must apply. Willing is not enough; we must do.\u201d \u2014 Goethe",
    12: "\u201cLearning is not compulsory\u2026 neither is survival.\u201d \u2014 W. E. Deming",
}

def _easter(year: int) -> datetime.date:
    """Compute Easter Sunday for a given year (Anonymous Gregorian algorithm)."""
    a = year % 19
    b, c = divmod(year, 100)
    d, e = divmod(b, 4)
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i, k = divmod(c, 4)
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    month, day = divmod(h + l - 7 * m + 114, 31)
    return datetime.date(year, month, day + 1)


def get_danish_holidays(year: int) -> dict[datetime.date, str]:
    """Return all Danish public holidays for a given year."""
    easter = _easter(year)
    holidays = {
        # Fixed holidays
        datetime.date(year, 1, 1):   "Nytårsdag",
        datetime.date(year, 6, 5):   "Grundlovsdag",
        datetime.date(year, 12, 24): "Juleaften",
        datetime.date(year, 12, 25): "Juledag",
        datetime.date(year, 12, 26): "2. Juledag",
        # Moveable holidays (relative to Easter)
        easter + datetime.timedelta(days=-3):  "Skærtorsdag",
        easter + datetime.timedelta(days=-2):  "Langfredag",
        easter:                                "Påskedag",
        easter + datetime.timedelta(days=1):   "2. Påskedag",
        easter + datetime.timedelta(days=39):  "Kr. Himmelfart",
        easter + datetime.timedelta(days=49):  "Pinsedag",
        easter + datetime.timedelta(days=50):  "2. Pinsedag",
    }
    return holidays


def get_holidays_for_months(months: list[tuple[int, int]]) -> dict[datetime.date, str]:
    """Get Danish holidays for a list of (year, month) pairs."""
    years = {y for y, _ in months}
    month_set = set(months)
    holidays = {}
    for y in years:
        for d, name in get_danish_holidays(y).items():
            if (d.year, d.month) in month_set:
                holidays[d] = name
    return holidays

# Stripe pattern for weekend columns
STRIPE_COLOR = (0.85, 0.90, 1.0)  # light blue
STRIPE_COLOR_DARK = (0.45, 0.55, 0.80)  # darker blue for date boxes
STRIPE_GAP = 2.5  # points between stripes
STRIPE_WIDTH = 1.0  # stripe line width

# --- Average daily temperature for Aalborg, Denmark (climate normals 1991–2020) ---
AALBORG_MONTHLY_TEMPS = {
    1: 1.4, 2: 1.4, 3: 3.5, 4: 7.5, 5: 11.8, 6: 15.0,
    7: 17.0, 8: 16.6, 9: 13.5, 10: 9.2, 11: 5.4, 12: 2.6,
}
_DAYS_BEFORE_MONTH = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]


def get_avg_temperature(month: int, day: int) -> float:
    """Linearly interpolated average daily temperature for Aalborg."""
    doy = _DAYS_BEFORE_MONTH[month - 1] + day
    temps = list(AALBORG_MONTHLY_TEMPS.values())
    mid_days = [_DAYS_BEFORE_MONTH[m] + 15 for m in range(12)]
    mid_ext = [mid_days[-1] - 365] + mid_days + [mid_days[0] + 365]
    temps_ext = [temps[-1]] + temps + [temps[0]]
    for i in range(len(mid_ext) - 1):
        if mid_ext[i] <= doy <= mid_ext[i + 1]:
            frac = (doy - mid_ext[i]) / (mid_ext[i + 1] - mid_ext[i])
            return round(temps_ext[i] + (temps_ext[i + 1] - temps_ext[i]) * frac, 1)
    return temps[month - 1]


# --- Notable tech history events keyed by (month, day) ---
TECH_EVENTS: dict[tuple[int, int], str] = {
    (1, 1): "ARPANET\u2192TCP/IP '83",
    (1, 3): "Bitcoin genesis '09",
    (1, 9): "iPhone unveiled '07",
    (1, 15): "Wikipedia launch '01",
    (1, 24): "Macintosh released '84",
    (1, 27): "iPad unveiled '10",
    (2, 4): "Facebook launched '04",
    (2, 14): "YouTube founded '05",
    (2, 24): "Steve Jobs born '55",
    (3, 12): "WWW proposed '89",
    (3, 14): "Einstein born 1879",
    (3, 21): "First tweet '06",
    (3, 31): "Mosaic browser '93",
    (4, 1): "Apple founded '76",
    (4, 3): "First cell call '73",
    (4, 12): "Gagarin in space '61",
    (4, 25): "DNA published '53",
    (5, 1): "BASIC language '64",
    (5, 11): "Deep Blue wins '97",
    (5, 22): "Ethernet memo '73",
    (5, 24): "First telegraph 1844",
    (6, 10): "Apple II shipped '77",
    (6, 23): "Turing born 1912",
    (6, 29): "iPhone on sale '07",
    (7, 1): "Sony Walkman '79",
    (7, 5): "Amazon founded '94",
    (7, 20): "Moon landing '69",
    (7, 29): "NASA established '58",
    (8, 6): "First website '91",
    (8, 12): "IBM PC released '81",
    (8, 19): "Google IPO '04",
    (8, 24): "Windows 95 launch",
    (8, 25): "Linux announced '91",
    (9, 4): "Google founded '98",
    (9, 12): "First IC demo '58",
    (9, 21): "GNU announced '83",
    (10, 6): "Instagram launch '10",
    (10, 22): "iPod unveiled '01",
    (10, 29): "ARPANET 1st msg '69",
    (11, 1): "Firefox 1.0 '04",
    (11, 12): "Philae comet '14",
    (11, 20): "Windows 1.0 '85",
    (11, 30): "ChatGPT released '22",
    (12, 3): "First SMS sent '92",
    (12, 9): "Mother of Demos '68",
    (12, 10): "Ada Lovelace b. 1815",
    (12, 17): "Wright Bros fly 1903",
    (12, 21): "SpaceX landing '15",
    (12, 25): "1st web browser '90",
}


def get_municipality_deadlines(year: int) -> dict[datetime.date, str]:
    """Common Danish civic and tax deadlines for a given year."""
    return {
        datetime.date(year, 1, 20): "Ejendomsskat 1. rate",
        datetime.date(year, 3, 1): "Ejendomsvurdering frist",
        datetime.date(year, 5, 1): "Selvangivelse frist",
        datetime.date(year, 7, 1): "Udvidet selvangivelse",
        datetime.date(year, 7, 20): "Ejendomsskat 2. rate",
        datetime.date(year, 9, 1): "Forskudsopgørelse åbner",
        datetime.date(year, 11, 1): "Forskudsopgørelse frist",
    }


def get_deadlines_for_months(months: list[tuple[int, int]]) -> dict[datetime.date, str]:
    """Get municipality deadlines for a list of (year, month) pairs."""
    years = {y for y, _ in months}
    month_set = set(months)
    deadlines = {}
    for y in years:
        for d, name in get_municipality_deadlines(y).items():
            if (d.year, d.month) in month_set:
                deadlines[d] = name
    return deadlines


MONTH_ABBR_MAP = {
    'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
    'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12,
}


def parse_project_timeline(html_path: str, year: int) -> dict[datetime.date, str]:
    """Parse project_timeline.html and extract key deadlines."""
    path = Path(html_path)
    if not path.exists():
        return {}

    text = path.read_text(encoding='utf-8')
    deadlines: dict[datetime.date, str] = {}

    def _parse_date(s: str) -> datetime.date | None:
        s = re.sub(r'\s+\d+:\d+', '', s).strip()
        m = re.match(r'(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\d+)\s+(\w+)', s)
        if m and m.group(2) in MONTH_ABBR_MAP:
            return datetime.date(year, MONTH_ABBR_MAP[m.group(2)], int(m.group(1)))
        return None

    # Phase deadlines from phase-header rows (added first, may be overridden)
    for m in re.finditer(r'Phase\s+\d+:\s*(.+?)\s*\(deadline:\s*([^)]+)\)', text):
        d = _parse_date(m.group(2))
        if d:
            desc = m.group(1).strip()
            deadlines[d] = desc

    # Milestone rows with specific dates override phase labels
    for row_m in re.finditer(r'<tr[^>]*>(.*?)</tr>', text, re.DOTALL):
        row_html = row_m.group(0)
        row_content = row_m.group(1)
        if 'phase-header' in row_html:
            continue
        cells = re.findall(r'<td[^>]*>(.*?)</td>', row_content, re.DOTALL)
        if len(cells) < 3:
            continue
        if re.sub(r'<[^>]+>', '', cells[0]).strip():
            continue
        date_text = re.sub(r'<[^>]+>', '', cells[1]).strip()
        if re.match(r'\d+\s*-\s*\d+', date_text):
            continue
        d = _parse_date(date_text)
        if d:
            desc = re.sub(r'<[^>]+>', '', cells[2]).strip()
            if desc.startswith('Present:'):
                desc = 'Presentation'
            if desc and desc != '--':
                deadlines[d] = desc

    return deadlines


def get_project_deadlines_for_months(
    html_path: str, months: list[tuple[int, int]]
) -> dict[datetime.date, str]:
    """Get project timeline deadlines filtered to specific months."""
    month_set = set(months)
    result: dict[datetime.date, str] = {}
    for y in {y for y, _ in months}:
        for d, desc in parse_project_timeline(html_path, y).items():
            if (d.year, d.month) in month_set:
                result[d] = desc
    return result


def parse_dates_md(md_path: str) -> dict[datetime.date, str]:
    """Parse a dates.md file into a dict of date -> description.

    Expected line format: YYYY-MM-DD | description
    Lines starting with # and blank lines are skipped.
    Stops at '## Synced Calendar' to avoid double-counting synced events.
    """
    path = Path(md_path)
    if not path.exists():
        return {}
    dates: dict[datetime.date, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if stripped == SYNCED_SECTION:
            break
        if not stripped or stripped.startswith("#") or "|" not in stripped:
            continue
        parts = stripped.split("|", 1)
        if len(parts) != 2:
            continue
        date_str = parts[0].strip()
        desc = parts[1].strip()
        try:
            d = datetime.date.fromisoformat(date_str)
            dates[d] = desc
        except ValueError:
            continue
    return dates


def get_dates_md_for_months(
    md_path: str, months: list[tuple[int, int]]
) -> dict[datetime.date, str]:
    """Get dates from a markdown file filtered to specific months."""
    month_set = set(months)
    return {
        d: desc
        for d, desc in parse_dates_md(md_path).items()
        if (d.year, d.month) in month_set
    }


SYNCED_SECTION = "## Events from Synced Calendars"

# Colors assigned to calendars in order
CALENDAR_COLORS: list[tuple[float, float, float]] = [
    (0.0, 0.4, 0.8),   # blue
    (0.8, 0.2, 0.0),   # red-orange
    (0.0, 0.55, 0.3),   # green
    (0.6, 0.0, 0.6),   # purple
    (0.8, 0.5, 0.0),   # amber
    (0.0, 0.5, 0.5),   # teal
]


def _parse_calendar_sections(md_path: Path) -> list[tuple[str, str]]:
    """Parse ### headings and their associated URLs from a dates file.

    Returns list of (name, url) pairs. Stops at the synced section.
    """
    if not md_path.exists():
        return []
    sections: list[tuple[str, str]] = []
    current_name = None
    for line in md_path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if stripped == SYNCED_SECTION:
            break
        if stripped.startswith("### "):
            current_name = stripped[4:].strip()
        elif stripped.startswith("http") and current_name:
            sections.append((current_name, stripped))
    return sections


def sync_dates_file(
    md_path: Path,
    start_date: datetime.date,
    end_date: datetime.date,
) -> None:
    """Fetch iCal URLs found in a dates file and update its Synced Calendar section."""
    if not md_path.exists():
        return
    cal_sections = _parse_calendar_sections(md_path)

    # Always clear old synced data first
    content = md_path.read_text(encoding="utf-8")
    pattern = rf"(?m)^{re.escape(SYNCED_SECTION)}\s*\n[\s\S]*?(?=^## |\Z)"
    content = re.sub(pattern, "", content).rstrip()
    content += f"\n\n{SYNCED_SECTION}\n"
    md_path.write_text(content, encoding="utf-8")

    if not cal_sections:
        return

    # Fetch events grouped by calendar name
    events_by_cal: dict[str, dict[datetime.date, list[str]]] = {}
    for name, url in cal_sections:
        try:
            req = Request(url, headers={"User-Agent": "calendar_print/1.0"})
            with urlopen(req) as resp:
                cal = ICalendar.from_ical(resp.read())
            cal_events: dict[datetime.date, list[str]] = {}
            for component in cal.walk("VEVENT"):
                summary = str(component.get("SUMMARY", "")).strip()
                if not summary:
                    continue
                dt = component.get("DTSTART")
                if dt is None:
                    continue
                dt = dt.dt
                if isinstance(dt, datetime.datetime):
                    local_tz = ZoneInfo("Europe/Copenhagen")
                    if dt.tzinfo is not None:
                        dt = dt.astimezone(local_tz)
                    else:
                        dt = dt.replace(tzinfo=local_tz)
                    time_str = dt.strftime("%H:%M")
                    d = dt.date()
                    entry = f"{time_str} {summary}"
                elif isinstance(dt, datetime.date):
                    d = dt
                    entry = summary
                else:
                    continue
                if start_date <= d < end_date:
                    cal_events.setdefault(d, []).append(entry)
            events_by_cal[name] = cal_events
        except Exception as e:
            print(f"  Warning: failed to fetch {url[:60]}...: {e}")

    # Rewrite the Synced Calendar section with ### sub-headings
    content = md_path.read_text(encoding="utf-8")
    pattern = rf"(?m)^{re.escape(SYNCED_SECTION)}\s*\n[\s\S]*?(?=^## |\Z)"
    content = re.sub(pattern, "", content).rstrip()
    lines = [f"\n\n{SYNCED_SECTION}\n"]
    for name, cal_events in events_by_cal.items():
        lines.append(f"\n### {name}\n")
        for d in sorted(cal_events.keys()):
            for entry in sorted(cal_events[d]):
                lines.append(f"{d.isoformat()} | {entry}")
    content += "\n".join(lines) + "\n"
    md_path.write_text(content, encoding="utf-8")

    total = sum(sum(len(v) for v in ce.values()) for ce in events_by_cal.values())
    print(f"  {md_path.name}: synced {total} events from {len(cal_sections)} feed(s)")


# Type for calendar events: date -> list of (prefix_letter, text, color, calendar_name)
CalEvent = tuple[str, str, tuple[float, float, float], str]


def parse_synced_dates_md(md_path: str) -> dict[datetime.date, list[CalEvent]]:
    """Parse synced calendar sections from a dates file.

    Reads ### sub-headings under ## Synced Calendar to determine calendar name.
    Returns date -> list of (prefix_letter, text, color).
    """
    path = Path(md_path)
    if not path.exists():
        return {}

    content = path.read_text(encoding="utf-8")
    # Find the Synced Calendar section
    match = re.search(rf"(?m)^{re.escape(SYNCED_SECTION)}\s*\n([\s\S]*?)(?=^## |\Z)", content)
    if not match:
        return {}

    section = match.group(1)
    result: dict[datetime.date, list[CalEvent]] = {}
    current_name = ""
    color_idx = 0
    cal_colors: dict[str, tuple[float, float, float]] = {}

    for line in section.splitlines():
        line = line.strip()
        if line.startswith("### "):
            current_name = line[4:].strip()
            if current_name not in cal_colors:
                cal_colors[current_name] = CALENDAR_COLORS[color_idx % len(CALENDAR_COLORS)]
                color_idx += 1
            continue
        if not line or "|" not in line:
            continue
        parts = line.split("|", 1)
        if len(parts) != 2:
            continue
        date_str = parts[0].strip()
        desc = parts[1].strip()
        try:
            d = datetime.date.fromisoformat(date_str)
        except ValueError:
            continue
        prefix = current_name[0].upper() if current_name else "?"
        color = cal_colors.get(current_name, (0.4, 0.4, 0.4))
        result.setdefault(d, []).append((prefix, desc, color, current_name))

    return result


def get_synced_dates_for_months(
    md_path: str, months: list[tuple[int, int]]
) -> dict[datetime.date, list[CalEvent]]:
    """Get synced calendar events filtered to specific months."""
    month_set = set(months)
    return {
        d: events
        for d, events in parse_synced_dates_md(md_path).items()
        if (d.year, d.month) in month_set
    }


def get_weeks(year: int, month: int) -> list[list[int | None]]:
    """Return weeks for a month, each week starting Monday ending Sunday."""
    last_day_num = calendar.monthrange(year, month)[1]

    weeks: list[list[int | None]] = []
    current_week: list[int | None] = [None] * 7

    for day_num in range(1, last_day_num + 1):
        d = datetime.date(year, month, day_num)
        col = d.weekday()  # Mon->0, Tue->1, ... Sat->5, Sun->6

        current_week[col] = day_num

        if col == 6 or day_num == last_day_num:
            weeks.append(current_week)
            current_week = [None] * 7

    return weeks


def iso_week_for_row(year: int, month: int, week_days: list[int | None]) -> int:
    """Get the ISO week number for this row.

    Uses the first available day in the row to determine the week number.
    """
    for d in week_days:
        if d is not None:
            return datetime.date(year, month, d).isocalendar()[1]
    return 0


def get_month_week_range(year: int, month: int, weeks: list[list[int | None]]) -> str:
    """Get the range of ISO week numbers present in a month."""
    wk_nums = set()
    for week_days in weeks:
        wk = iso_week_for_row(year, month, week_days)
        if wk:
            wk_nums.add(wk)
    sorted_wks = sorted(wk_nums)
    if not sorted_wks:
        return ""
    if len(sorted_wks) == 1:
        return f"(W{sorted_wks[0]})"
    return f"(W{sorted_wks[0]}\u2013{sorted_wks[-1]})"


def draw_striped_rect(c: canvas.Canvas, x: float, y: float, w: float, h: float,
                      color: tuple[float, float, float] = STRIPE_COLOR,
                      origin: tuple[float, float] | None = None) -> None:
    """Fill a rectangle with a light tint (weekend/holiday shading)."""
    c.saveState()
    c.setFillColorRGB(*color)
    c.rect(x, y, w, h, fill=1, stroke=0)
    c.restoreState()


def draw_hatched_rect(c: canvas.Canvas, x: float, y: float, w: float, h: float,
                      color: tuple[float, float, float] = (1.0, 0.85, 0.85),
                      gap: float = 4.0, line_width: float = 0.6) -> None:
    """Fill a rectangle with a light tint (project deadline shading)."""
    c.saveState()
    c.setFillColorRGB(*color)
    c.rect(x, y, w, h, fill=1, stroke=0)
    c.restoreState()


def draw_month(c: canvas.Canvas, x_off: float, y_off: float, year: int, month: int,
               holidays: dict[datetime.date, str] | None = None,
               deadlines: dict[datetime.date, str] | None = None,
               astro_events: dict[datetime.date, str] | None = None,
               project_deadlines: dict[datetime.date, str] | None = None,
               cal_events: dict[datetime.date, list[CalEvent]] | None = None,
               region_w: float = A5_W, region_h: float = A5_H,
               compact: bool = False) -> None:
    """Draw one month calendar in a given region (default A5).

    If compact is True, only draw day numbers (no boxes, temperatures, or in-cell text).
    """
    holidays = holidays or {}
    deadlines = deadlines or {}
    astro_events = astro_events or {}
    project_deadlines = project_deadlines or {}
    cal_events = cal_events or {}
    usable_w = region_w - 2 * MARGIN
    usable_h = region_h - 2 * MARGIN

    inner_x = x_off + MARGIN
    inner_y = y_off + MARGIN
    top_y = inner_y + usable_h

    weeks = get_weeks(year, month)
    num_rows = len(weeks)

    # Column widths - narrow week column
    wk_col_w = 8 * mm
    day_col_w = (usable_w - wk_col_w) / 7

    # --- Month/year title with week range ---
    c.setFont("Helvetica-Bold", 14)
    wk_range = get_month_week_range(year, month, weeks)
    title = f"{calendar.month_name[month]} {year}"
    c.drawString(inner_x + wk_col_w, top_y - 7 * mm, title)

    # Week range in smaller font next to title
    title_w = c.stringWidth(title, "Helvetica-Bold", 14)
    c.setFont("Helvetica", 9)
    c.setFillColorRGB(0.4, 0.4, 0.4)
    c.drawString(inner_x + wk_col_w + title_w + 3 * mm, top_y - 7 * mm, wk_range)
    c.setFillColorRGB(0, 0, 0)

    # --- Quote in italics below title (word-wrapped to fit region) ---
    quote = MONTHLY_QUOTES.get(month, "") if not compact else ""
    if quote:
        c.saveState()
        quote_font = "Helvetica-Oblique"
        quote_size = 6
        c.setFont(quote_font, quote_size)
        c.setFillColorRGB(0.35, 0.35, 0.35)
        max_quote_w = usable_w - wk_col_w
        words = quote.split()
        q_lines: list[str] = []
        cur_line = ""
        for w in words:
            trial = f"{cur_line} {w}".strip()
            if pdfmetrics.stringWidth(trial, quote_font, quote_size) <= max_quote_w:
                cur_line = trial
            else:
                if cur_line:
                    q_lines.append(cur_line)
                cur_line = w
        if cur_line:
            q_lines.append(cur_line)
        q_y = top_y - 12 * mm
        for ql in q_lines:
            c.drawString(inner_x + wk_col_w, q_y, ql)
            q_y -= quote_size + 1.5
        c.restoreState()

    # --- Table area ---
    table_top = top_y - HEADER_HEIGHT
    table_h = usable_h - HEADER_HEIGHT
    row_h = (table_h - DAY_HEADER_HEIGHT) / num_rows

    # --- Day-of-week header ---
    header_y = table_top - DAY_HEADER_HEIGHT

    # Solid light grey background for entire header row
    c.setFillColorRGB(0.85, 0.85, 0.85)
    c.rect(inner_x, header_y, usable_w, DAY_HEADER_HEIGHT, fill=1, stroke=0)
    c.setFillColorRGB(0, 0, 0)

    # Blue stripes over grey on weekend header cells
    header_stripe_origin = (inner_x, inner_y)
    for col_idx in (5, 6):  # Sat, Sun
        cell_x = inner_x + wk_col_w + col_idx * day_col_w
        draw_striped_rect(c, cell_x, header_y, day_col_w, DAY_HEADER_HEIGHT,
                          origin=header_stripe_origin)

    c.setFont("Helvetica-Bold", 9)
    # "Wk" label
    c.setFont("HeiseiKakuGo-W5", 9)
    c.drawCentredString(inner_x + wk_col_w / 2, header_y + 2 * mm, "\u9031")

    # Day names in Japanese kanji
    c.setFont("HeiseiKakuGo-W5", 10)
    for i, day_name in enumerate(DAYS):
        cx = inner_x + wk_col_w + i * day_col_w + day_col_w / 2
        c.drawCentredString(cx, header_y + 2 * mm, day_name)
    c.setFont("Helvetica-Bold", 9)

    # --- Week rows ---
    table_bottom = header_y - num_rows * row_h
    day_box_size = 4 * mm
    day_box_pad = 1.2  # padding inside the day number box

    for row_idx, week_days in enumerate(weeks):
        row_top = header_y - row_idx * row_h
        row_bottom = row_top - row_h

        # Shade weekend columns (Sat=5, Sun=6) and holidays
        stripe_origin = (inner_x, inner_y)
        for col_idx in (5, 6):
            cell_x = inner_x + wk_col_w + col_idx * day_col_w
            draw_striped_rect(c, cell_x, row_bottom, day_col_w, row_h,
                              origin=stripe_origin)
        for col_idx, day_num in enumerate(week_days):
            if col_idx < 5 and day_num is not None:  # skip Sat/Sun already striped
                if datetime.date(year, month, day_num) in holidays:
                    cell_x = inner_x + wk_col_w + col_idx * day_col_w
                    draw_striped_rect(c, cell_x, row_bottom, day_col_w, row_h,
                                      origin=stripe_origin)

        # Red hatched background for project deadline cells
        for col_idx, day_num in enumerate(week_days):
            if day_num is not None:
                if datetime.date(year, month, day_num) in project_deadlines:
                    cell_x = inner_x + wk_col_w + col_idx * day_col_w
                    draw_hatched_rect(c, cell_x, row_bottom, day_col_w, row_h)

        # Week number and sprint number (only if row has a Monday)
        wk_num = iso_week_for_row(year, month, week_days)
        sprint_num = wk_num // 2
        wk_cx = inner_x + wk_col_w / 2
        wk_cy = row_top - row_h / 2
        c.setFont("Helvetica-Bold", 7)
        c.setFillColorRGB(0.4, 0.4, 0.4)
        c.drawCentredString(wk_cx, wk_cy + 1, str(wk_num))
        c.setFont("Helvetica", 5.5)
        c.drawCentredString(wk_cx, wk_cy - 6, f"S{sprint_num}")
        c.setFillColorRGB(0, 0, 0)

        # Day numbers
        for col_idx, day_num in enumerate(week_days):
            if day_num is not None:
                cell_x = inner_x + wk_col_w + col_idx * day_col_w
                box_x = cell_x + day_col_w - day_box_size - 1
                box_y = row_top - day_box_size - 1

                if compact:
                    # Just the day number, no box or decorations
                    c.setFont("Helvetica", 7)
                    cap_height = 7 * 0.72
                    c.drawCentredString(
                        box_x + day_box_size / 2,
                        box_y + (day_box_size - cap_height) / 2,
                        str(day_num),
                    )
                    continue

                # White background for date box
                c.setFillColorRGB(1, 1, 1)
                c.rect(box_x, box_y, day_box_size, day_box_size, fill=1, stroke=0)
                c.setFillColorRGB(0, 0, 0)

                # Draw the box border
                d = datetime.date(year, month, day_num)
                is_weekend = col_idx in (5, 6)
                is_holiday = d in holidays
                if is_weekend or is_holiday:
                    # Thick striped border on weekend/holiday date boxes
                    border_w = 1.5
                    c.saveState()
                    clip = c.beginPath()
                    clip.rect(cell_x, row_bottom, day_col_w, row_h)
                    c.clipPath(clip, stroke=0)
                    draw_striped_rect(c, box_x - border_w, box_y - border_w,
                                      day_box_size + 2 * border_w,
                                      day_box_size + 2 * border_w,
                                      color=STRIPE_COLOR_DARK,
                                      origin=stripe_origin)
                    c.setFillColorRGB(1, 1, 1)
                    c.rect(box_x, box_y, day_box_size, day_box_size, fill=1, stroke=0)
                    c.setFillColorRGB(0, 0, 0)
                    c.restoreState()
                else:
                    c.setLineWidth(0.8)
                    c.setStrokeColorRGB(0.8, 0.0, 0.0)
                    c.rect(box_x, box_y, day_box_size, day_box_size)
                    c.setStrokeColorRGB(0, 0, 0)

                # Day number centered in box
                c.setFont("Helvetica", 7)
                num_str = str(day_num)
                cap_height = 7 * 0.72
                c.drawCentredString(
                    box_x + day_box_size / 2,
                    box_y + (day_box_size - cap_height) / 2,
                    num_str,
                )

                # Average temperature top-left
                temp = get_avg_temperature(month, day_num)
                c.saveState()
                c.setFont("Helvetica", 6)
                c.setFillColorRGB(0.4, 0.4, 0.4)
                c.drawString(cell_x + 1.5, row_top - 7, f"{temp:.0f}\u00b0")
                c.restoreState()

                # --- Info text stacked at bottom of cell ---
                is_deadline = d in deadlines
                astro = astro_events.get(d)

                info_lines: list[tuple[str, str, float, tuple[float, float, float]]] = []
                evt_font = "Helvetica"
                evt_size = 5
                if is_holiday:
                    info_lines.append((holidays[d], evt_font, evt_size, (0.4, 0.4, 0.4)))
                if d in project_deadlines:
                    info_lines.append((project_deadlines[d], evt_font, evt_size, (0.6, 0.0, 0.0)))
                if is_deadline:
                    info_lines.append((deadlines[d], evt_font, evt_size, (0.7, 0.15, 0.0)))
                if astro:
                    info_lines.append((astro, evt_font, evt_size, (0.4, 0.1, 0.5)))
                for _prefix, text, color, _name in cal_events.get(d, []):
                    info_lines.append((text, evt_font, evt_size, color))

                line_step = 6.5
                max_text_w = day_col_w - 3
                text_x = cell_x + 1.5
                # Wrap each info line to fit cell width
                # Each entry: (text, font, size, color, x_offset)
                all_lines: list[tuple[str, str, float, tuple[float, float, float], float]] = []
                for text, font, size, color in info_lines:
                    # Determine indent for continuation lines
                    indent = 0.0
                    # Check for time prefix "HH:MM " or calendar prefix "X: "
                    if len(text) > 6 and text[2] == ":" and text[5] == " ":
                        indent = pdfmetrics.stringWidth(text[:6], font, size)
                    elif len(text) > 3 and text[1] == ":" and text[2] == " ":
                        prefix_end = 3
                        # "X: HH:MM " — check for time after prefix
                        rest = text[3:]
                        if len(rest) > 6 and rest[2] == ":" and rest[5] == " ":
                            prefix_end = 3 + 6
                        indent = pdfmetrics.stringWidth(text[:prefix_end], font, size)
                    words = text.split()
                    cur = ""
                    first_line = True
                    for w in words:
                        trial = f"{cur} {w}".strip()
                        avail = max_text_w if first_line else max_text_w - indent
                        if pdfmetrics.stringWidth(trial, font, size) <= avail:
                            cur = trial
                        else:
                            if cur:
                                x_off = 0.0 if first_line else indent
                                all_lines.append((cur, font, size, color, x_off))
                                first_line = False
                            cur = w
                    if cur:
                        x_off = 0.0 if first_line else indent
                        all_lines.append((cur, font, size, color, x_off))
                # Draw top-down from below the day box
                has_texture = is_weekend or is_holiday or d in project_deadlines
                text_top = row_top - day_box_size - 2
                if has_texture and all_lines:
                    # White box behind text for readability on textured cells
                    first_y = text_top - line_step
                    last_y = text_top - len(all_lines) * line_step
                    last_y = max(last_y, row_bottom)
                    pad = 1
                    c.setFillColorRGB(1, 1, 1)
                    c.rect(cell_x + pad, last_y - pad,
                           day_col_w - 2 * pad, first_y - last_y + line_step + 2 * pad,
                           fill=1, stroke=0)
                    c.setFillColorRGB(0, 0, 0)
                for i, (wline, font, size, color, x_off) in enumerate(all_lines):
                    y_pos = text_top - (i + 1) * line_step
                    if y_pos < row_bottom:
                        break
                    c.saveState()
                    c.setFont(font, size)
                    c.setFillColorRGB(*color)
                    c.drawString(text_x + x_off, y_pos, wline)
                    c.restoreState()


    # --- Grid lines drawn on top of everything ---
    # Horizontal line under header
    c.setLineWidth(0.8)
    c.line(inner_x, header_y, inner_x + usable_w, header_y)

    # Horizontal lines between rows
    c.setLineWidth(0.3)
    for row_idx in range(num_rows):
        row_bottom = header_y - (row_idx + 1) * row_h
        c.line(inner_x, row_bottom, inner_x + usable_w, row_bottom)

    # Vertical lines
    c.setLineWidth(0.3)
    c.line(inner_x + wk_col_w, table_top, inner_x + wk_col_w, table_bottom)
    for i in range(1, 7):
        x = inner_x + wk_col_w + i * day_col_w
        c.line(x, table_top, x, table_bottom)

    # Outer border
    c.setLineWidth(1)
    c.rect(inner_x, table_bottom, usable_w, table_top - table_bottom)


def draw_mini_month(c: canvas.Canvas, x_off: float, y_off: float,
                    region_w: float, region_h: float, year: int, month: int,
                    holidays: dict[datetime.date, str] | None = None) -> None:
    """Draw a small month for the all-months-on-one-page yearview layout.

    Only shows day numbers, day-of-week headers, ISO week column, and
    weekend/holiday shading. No quotes, temperatures, or per-day events.
    """
    holidays = holidays or {}
    margin = 3 * mm
    inner_x = x_off + margin
    inner_y = y_off + margin
    usable_w = region_w - 2 * margin
    usable_h = region_h - 2 * margin
    top_y = inner_y + usable_h

    weeks = get_weeks(year, month)
    num_rows = len(weeks)

    wk_col_w = 6 * mm
    day_col_w = (usable_w - wk_col_w) / 7

    # --- Title ---
    title_h = 5.5 * mm
    c.setFont("Helvetica-Bold", 9)
    title = f"{calendar.month_name[month]} {year}"
    c.drawString(inner_x + wk_col_w, top_y - 4 * mm, title)
    title_w = c.stringWidth(title, "Helvetica-Bold", 9)
    wk_range = get_month_week_range(year, month, weeks)
    c.setFont("Helvetica", 6)
    c.setFillColorRGB(0.4, 0.4, 0.4)
    c.drawString(inner_x + wk_col_w + title_w + 2 * mm, top_y - 4 * mm, wk_range)
    c.setFillColorRGB(0, 0, 0)

    # --- Day-of-week header ---
    day_header_h = 4 * mm
    header_y = top_y - title_h - day_header_h
    c.setFillColorRGB(0.85, 0.85, 0.85)
    c.rect(inner_x, header_y, usable_w, day_header_h, fill=1, stroke=0)
    c.setFillColorRGB(0, 0, 0)
    for col_idx in (5, 6):
        cell_x = inner_x + wk_col_w + col_idx * day_col_w
        draw_striped_rect(c, cell_x, header_y, day_col_w, day_header_h)

    c.setFont("HeiseiKakuGo-W5", 6)
    c.drawCentredString(inner_x + wk_col_w / 2, header_y + 1.2 * mm, "週")
    c.setFont("HeiseiKakuGo-W5", 7)
    for i, day_name in enumerate(DAYS):
        cx = inner_x + wk_col_w + i * day_col_w + day_col_w / 2
        c.drawCentredString(cx, header_y + 1.2 * mm, day_name)

    # --- Week rows ---
    rows_area_h = header_y - inner_y
    row_h = rows_area_h / num_rows
    table_bottom = header_y - num_rows * row_h

    for row_idx, week_days in enumerate(weeks):
        row_top = header_y - row_idx * row_h
        row_bottom = row_top - row_h

        # Weekend stripes
        for col_idx in (5, 6):
            cell_x = inner_x + wk_col_w + col_idx * day_col_w
            draw_striped_rect(c, cell_x, row_bottom, day_col_w, row_h)
        # Holiday stripes on weekdays
        for col_idx, day_num in enumerate(week_days):
            if col_idx < 5 and day_num is not None:
                if datetime.date(year, month, day_num) in holidays:
                    cell_x = inner_x + wk_col_w + col_idx * day_col_w
                    draw_striped_rect(c, cell_x, row_bottom, day_col_w, row_h)

        # ISO week number
        wk_num = iso_week_for_row(year, month, week_days)
        c.setFont("Helvetica-Bold", 6)
        c.setFillColorRGB(0.4, 0.4, 0.4)
        c.drawCentredString(inner_x + wk_col_w / 2,
                            row_top - row_h / 2 - 2, str(wk_num))
        c.setFillColorRGB(0, 0, 0)

        # Day numbers
        c.setFont("Helvetica", 7.5)
        for col_idx, day_num in enumerate(week_days):
            if day_num is not None:
                cell_x = inner_x + wk_col_w + col_idx * day_col_w
                c.drawCentredString(cell_x + day_col_w / 2,
                                    row_top - row_h / 2 - 2.5, str(day_num))

    # --- Grid lines ---
    c.setLineWidth(0.25)
    for r in range(num_rows + 1):
        y = header_y - r * row_h
        c.line(inner_x, y, inner_x + usable_w, y)
    c.line(inner_x + wk_col_w, header_y + day_header_h,
           inner_x + wk_col_w, table_bottom)
    for i in range(1, 8):
        x = inner_x + wk_col_w + i * day_col_w
        c.line(x, header_y + day_header_h, x, table_bottom)
    # Header underline
    c.setLineWidth(0.5)
    c.line(inner_x, header_y, inner_x + usable_w, header_y)
    # Outer border
    c.setLineWidth(0.7)
    c.rect(inner_x, table_bottom, usable_w,
           header_y + day_header_h - table_bottom)


def generate_yearview_pdf(year: int, month: int, num_months: int = 8,
                          output_path: str = "calendar_yearview.pdf",
                          cols: int = 2) -> None:
    """Generate a single-page A4 calendar with `num_months` months in a grid.

    Starts at (year, month) and runs forward num_months months.
    Layout: `cols` columns × ceil(num_months/cols) rows, filling the A4 page.
    """
    months: list[tuple[int, int]] = []
    for i in range(num_months):
        m = month + i
        y = year
        while m > 12:
            m -= 12
            y += 1
        months.append((y, m))

    all_holidays = get_holidays_for_months(months)

    rows = (num_months + cols - 1) // cols
    cell_w = A4_W / cols
    cell_h = A4_H / rows

    c = canvas.Canvas(output_path, pagesize=A4)
    first = months[0]
    last = months[-1]
    c.setTitle(
        f"Calendar {calendar.month_name[first[1]]} {first[0]}"
        f"–{calendar.month_name[last[1]]} {last[0]}"
    )

    for idx, (y, m) in enumerate(months):
        col = idx % cols
        row = idx // cols
        x_off = col * cell_w
        y_off = A4_H - (row + 1) * cell_h
        draw_mini_month(c, x_off, y_off, cell_w, cell_h, y, m,
                        holidays=all_holidays)

    # Light separators between cells
    c.setLineWidth(0.3)
    c.setDash(2, 3)
    c.setStrokeColorRGB(0.7, 0.7, 0.7)
    for r in range(1, rows):
        y = A4_H - r * cell_h
        c.line(0, y, A4_W, y)
    for col_i in range(1, cols):
        x = col_i * cell_w
        c.line(x, 0, x, A4_H)
    c.setDash()
    c.setStrokeColorRGB(0, 0, 0)

    c.save()
    print(f"Yearview calendar saved to {output_path}")


def draw_notes_panel(c: canvas.Canvas, x_off: float, y_off: float,
                     region_w: float, region_h: float) -> None:
    """Draw Notes and Upcoming boxes in the given region."""
    pad = MARGIN
    inner_x = x_off + pad
    inner_y = y_off + pad
    usable_w = region_w - 2 * pad
    usable_h = region_h - 2 * pad

    box_gap = 6 * mm
    line_spacing = 8 * mm
    title_area = 7 * mm
    upcoming_lines = 4
    upcoming_h = title_area + upcoming_lines * line_spacing
    notes_h = usable_h - box_gap - upcoming_h

    # --- Notes (top, fills remaining space) ---
    notes_y = inner_y + upcoming_h + box_gap
    c.setFont("Helvetica-Bold", 11)
    c.drawString(inner_x, notes_y + notes_h - 4 * mm, "Notes")
    content_top = notes_y + notes_h - title_area
    c.setLineWidth(0.3)
    c.setStrokeColorRGB(0.7, 0.7, 0.7)
    y = content_top - line_spacing
    while y > notes_y + 2:
        c.line(inner_x, y, inner_x + usable_w, y)
        y -= line_spacing
    c.setStrokeColorRGB(0, 0, 0)

    # --- Upcoming (bottom, 4 lines) ---
    upcoming_y = inner_y
    c.setFont("Helvetica-Bold", 11)
    c.drawString(inner_x, upcoming_y + upcoming_h - 4 * mm, "Upcoming")
    content_top = upcoming_y + upcoming_h - title_area
    c.setLineWidth(0.3)
    c.setStrokeColorRGB(0.7, 0.7, 0.7)
    for n in range(upcoming_lines):
        y = content_top - (n + 1) * line_spacing
        c.line(inner_x, y, inner_x + usable_w, y)
    c.setStrokeColorRGB(0, 0, 0)


def generate_calendar_pdf(year: int, month: int, output_path: str = "calendar.pdf",
                          timeline_path: str | None = None,
                          dates_md_path: str | None = None,
                          sync: bool = True,
                          public_only: bool = False) -> None:
    months = []
    for i in range(4):
        m = month + i
        y = year
        while m > 12:
            m -= 12
            y += 1
        months.append((y, m))

    # Resolve dates files
    dates_files: list[Path] = []
    if dates_md_path:
        dates_files.append(Path(dates_md_path))
    else:
        names = ["public_dates.md"] if public_only else ["public_dates.md", "private_dates.md"]
        for name in names:
            p = Path(__file__).parent / name
            if p.exists():
                dates_files.append(p)

    # Sync iCal feeds before reading dates
    if sync and dates_files:
        start_date = datetime.date(months[0][0], months[0][1], 1)
        end_y, end_m = months[-1]
        end_m += 1
        if end_m > 12:
            end_m = 1
            end_y += 1
        end_date = datetime.date(end_y, end_m, 1)
        print("Syncing calendar feeds...")
        for df in dates_files:
            sync_dates_file(df, start_date, end_date)

    all_holidays = get_holidays_for_months(months)
    all_deadlines = get_deadlines_for_months(months)
    all_astro = get_all_astro_events_for_months(months, denmark_only=True)
    all_project: dict[datetime.date, str] = {}
    if timeline_path:
        all_project = get_project_deadlines_for_months(timeline_path, months)
    all_cal_events: dict[datetime.date, list[CalEvent]] = {}
    for df in dates_files:
        md_dates = get_dates_md_for_months(str(df), months)
        all_deadlines.update(md_dates)
        synced = get_synced_dates_for_months(str(df), months)
        for d, events in synced.items():
            all_cal_events.setdefault(d, []).extend(events)
    # Dedup: if the same event text appears under multiple calendars on the
    # same date, keep it only in the most relevant one (the calendar whose
    # name appears in the event text, or the first occurrence otherwise).
    for d, events in all_cal_events.items():
        # Strip time prefix to get the core summary for comparison
        def core_summary(text: str) -> str:
            if len(text) > 5 and text[2] == ":" and text[5] == " ":
                return text[6:]
            return text
        seen: dict[str, int] = {}  # core_summary -> best index
        for i, (prefix, text, color, cal_name) in enumerate(events):
            core = core_summary(text)
            if core not in seen:
                seen[core] = i
            else:
                # Keep the one whose calendar name appears in the event text
                prev_i = seen[core]
                prev_name = events[prev_i][3]
                # Use first word of calendar name for matching
                cur_keyword = cal_name.split()[0].lower()
                prev_keyword = prev_name.split()[0].lower()
                core_lower = core.lower()
                if cur_keyword in core_lower and prev_keyword not in core_lower:
                    seen[core] = i
        keep = set(seen.values())
        all_cal_events[d] = [events[i] for i in sorted(keep)]
    c = canvas.Canvas(output_path, pagesize=A4)
    c.setTitle(f"Calendar {calendar.month_name[months[0][1]]}–{calendar.month_name[months[-1][1]]} {months[0][0]}")

    # --- Page 1: months 1 & 2 (full A5 each) ---
    draw_month(c, 0, A5_H, months[0][0], months[0][1], all_holidays, all_deadlines, all_astro, all_project, all_cal_events)
    draw_month(c, 0, 0, months[1][0], months[1][1], all_holidays, all_deadlines, all_astro, all_project, all_cal_events)
    c.setLineWidth(0.5)
    c.setDash(4, 4)
    c.setStrokeColorRGB(0.6, 0.6, 0.6)
    c.line(0, A5_H, A4_W, A5_H)
    c.setDash()
    c.setStrokeColorRGB(0, 0, 0)
    c.showPage()

    # --- Page 2: month 3 (full A5, top) + month 4 (half-width, bottom-left) + notes panel (bottom-right) ---
    draw_month(c, 0, A5_H, months[2][0], months[2][1], all_holidays, all_deadlines, all_astro, all_project, all_cal_events)

    half_w = A5_W / 2
    draw_month(c, 0, 0, months[3][0], months[3][1], all_holidays, all_deadlines, all_astro, all_project,
               all_cal_events, region_w=half_w, region_h=A5_H, compact=True)
    draw_notes_panel(c, half_w, 0, half_w, A5_H)

    c.setLineWidth(0.5)
    c.setDash(4, 4)
    c.setStrokeColorRGB(0.6, 0.6, 0.6)
    c.line(0, A5_H, A4_W, A5_H)
    c.setDash()
    c.setStrokeColorRGB(0, 0, 0)

    c.save()
    print(f"Calendar saved to {output_path}")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Generate a 4-month calendar PDF")
    today = datetime.date.today()
    parser.add_argument("month", type=int, nargs="?", default=today.month,
                        help="Start month (1-12, default: current month)")
    parser.add_argument("year", type=int, nargs="?", default=today.year,
                        help="Start year (default: current year)")
    parser.add_argument("-o", "--output", default=None, help="Output file (default: calendar_YYYY_MM.pdf)")
    parser.add_argument("-t", "--timeline", default=None,
                        help="Path to project_timeline.html (default: auto-detect in script dir)")
    parser.add_argument("-d", "--dates", default=None,
                        help="Path to dates markdown file (e.g. public_dates.md)")
    parser.add_argument("--no-sync", action="store_true",
                        help="Skip fetching iCal feeds")
    parser.add_argument("-p", "--public", action="store_true",
                        help="Only use public_dates.md (exclude private)")
    parser.add_argument("--yearview", type=int, metavar="N", default=None,
                        help="All-in-one mode: render N consecutive months on a single A4 page "
                             "(e.g. --yearview 8 for an 8-month overview).")
    parser.add_argument("--cols", type=int, default=2,
                        help="Columns in yearview grid (default 2)")
    args = parser.parse_args()

    if not 1 <= args.month <= 12:
        parser.error("Month must be 1-12")

    timeline = args.timeline
    if timeline is None:
        default_timeline = Path(__file__).parent / "project_timeline.html"
        if default_timeline.exists():
            timeline = str(default_timeline)

    if args.yearview:
        end_idx = args.yearview - 1
        end_m = args.month + end_idx
        end_y = args.year
        while end_m > 12:
            end_m -= 12
            end_y += 1
        output = args.output or (
            f"calendar_yearview_{args.year}_{args.month:02d}_to_{end_y}_{end_m:02d}.pdf"
        )
        generate_yearview_pdf(args.year, args.month, num_months=args.yearview,
                              output_path=output, cols=args.cols)
    else:
        output = args.output or f"calendar_{args.year}_{args.month:02d}.pdf"
        generate_calendar_pdf(args.year, args.month, output, timeline_path=timeline,
                              dates_md_path=args.dates, sync=not args.no_sync,
                              public_only=args.public)

    # Clean up old OAuth files
    script_dir = Path(__file__).parent
    for old_file in ("token.json", "credentials.json", "dates.md", "calendar_urls.txt"):
        p = script_dir / old_file
        if p.exists():
            p.unlink()
            print(f"Cleaned up {old_file}")

    # Flatten PDF with Ghostscript for fast printing
    if shutil.which("gs"):
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp_path = tmp.name
        subprocess.run([
            "gs", "-dNOPAUSE", "-dBATCH", "-dQUIET",
            "-sDEVICE=pdfwrite", "-dCompatibilityLevel=1.4",
            f"-sOutputFile={tmp_path}", output,
        ], check=True)
        shutil.move(tmp_path, output)
        print(f"Flattened {output} for fast printing")
