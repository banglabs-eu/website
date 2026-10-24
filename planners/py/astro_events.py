"""Astronomical events for 2025-2028.

Data includes solar/lunar eclipses, meteor shower peaks, solstices/equinoxes,
supermoons, and other notable events visible from Denmark/Northern Europe.

Sources verified via timeanddate.com, NASA, astropixels.com, earthsky.org,
and skyandtelescope.org.

All descriptions are kept under 25 characters for calendar display.
"""

import datetime

# ---------------------------------------------------------------------------
# Eclipse data: (date, type_str, description, visible_from_denmark)
#   visible_from_denmark:
#     True  = fully visible
#     "partial" = visible but as a lesser type (e.g. total elsewhere, partial in DK)
#     False = not visible from Denmark
# ---------------------------------------------------------------------------
ECLIPSES: list[tuple[datetime.date, str, str, bool | str]] = [
    # ---- 2025 ----
    (datetime.date(2025, 3, 14),  "total_lunar",   "Total lunar eclipse",    "partial"),  # total in Americas; partial rising in DK
    (datetime.date(2025, 3, 29),  "partial_solar",  "Partial solar eclipse",  True),       # 32% coverage in Copenhagen
    (datetime.date(2025, 9, 7),   "total_lunar",   "Total lunar eclipse",    True),       # fully visible from DK, 83 min totality
    (datetime.date(2025, 9, 21),  "partial_solar",  "Partial solar eclipse",  False),      # South Pacific only

    # ---- 2026 ----
    (datetime.date(2026, 2, 17),  "annular_solar",  "Annular solar eclipse",  False),      # Antarctica
    (datetime.date(2026, 3, 3),   "total_lunar",   "Total lunar eclipse",    False),      # Americas/E Asia; moon below horizon in DK
    (datetime.date(2026, 8, 12),  "total_solar",   "Total solar eclipse",    "partial"),  # total in Iceland/Spain; 84% partial in DK
    (datetime.date(2026, 8, 28),  "partial_lunar",  "Deep partial lunar ecl", True),       # 93% umbral coverage; visible early morning DK

    # ---- 2027 ----
    (datetime.date(2027, 2, 6),   "annular_solar",  "Annular solar eclipse",  False),      # S America/Africa
    (datetime.date(2027, 2, 20),  "penumbral_lunar","Penumbral lunar ecl",    True),       # 93% penumbral
    (datetime.date(2027, 7, 18),  "penumbral_lunar","Penumbral lunar ecl",    False),      # barely 0.3%
    (datetime.date(2027, 8, 2),   "total_solar",   "Total solar eclipse",    "partial"),  # total in Spain/N Africa; partial in DK
    (datetime.date(2027, 8, 17),  "penumbral_lunar","Penumbral lunar ecl",    True),       # visible from Europe

    # ---- 2028 ----
    (datetime.date(2028, 1, 12),  "partial_lunar",  "Partial lunar eclipse",  True),       # visible at night from Europe; 7% umbral
    (datetime.date(2028, 1, 26),  "annular_solar",  "Annular solar eclipse",  False),      # S America/Iberia; marginal partial in W Europe
    (datetime.date(2028, 7, 6),   "partial_lunar",  "Partial lunar eclipse",  "partial"),  # 39% umbral; penumbral phase visible from DK
    (datetime.date(2028, 7, 22),  "total_solar",   "Total solar eclipse",    False),      # Australia/SE Asia
    (datetime.date(2028, 12, 31), "total_lunar",   "Total lunar eclipse",    True),       # visible from DK; NYE blood moon, 72 min totality
]


# ---------------------------------------------------------------------------
# Major meteor shower peaks — recurring annually, keyed by (month, day).
# Peak dates shift by ~1 day year-to-year; these are the typical/average peaks.
# ZHR = zenithal hourly rate at peak under ideal conditions.
# All are visible from Denmark / Northern Europe.
# ---------------------------------------------------------------------------
METEOR_SHOWERS: dict[tuple[int, int], str] = {
    (1, 3):   "Quadrantids peak",       # ZHR ~120, narrow peak
    (4, 22):  "Lyrids peak",            # ZHR ~18
    (5, 6):   "Eta Aquariids peak",     # ZHR ~50, better from south but visible
    (7, 30):  "Delta Aquariids peak",   # ZHR ~25
    (8, 12):  "Perseids peak",          # ZHR ~100, best summer shower
    (10, 21): "Orionids peak",          # ZHR ~20
    (11, 17): "Leonids peak",           # ZHR ~15
    (12, 14): "Geminids peak",          # ZHR ~150, best annual shower
    (12, 22): "Ursids peak",            # ZHR ~10, favors N hemisphere
}


# ---------------------------------------------------------------------------
# Solstices and equinoxes — exact dates in UTC (from astropixels.com / USNO).
# Keyed by (year, month, day) -> description.
# ---------------------------------------------------------------------------
SOLSTICES_EQUINOXES: dict[datetime.date, str] = {
    # 2025
    datetime.date(2025, 3, 20):  "Vernal equinox",       # 09:02 UTC
    datetime.date(2025, 6, 21):  "Summer solstice",      # 02:42 UTC
    datetime.date(2025, 9, 22):  "Autumnal equinox",     # 18:20 UTC
    datetime.date(2025, 12, 21): "Winter solstice",      # 15:03 UTC

    # 2026
    datetime.date(2026, 3, 20):  "Vernal equinox",       # 14:46 UTC
    datetime.date(2026, 6, 21):  "Summer solstice",      # 08:25 UTC
    datetime.date(2026, 9, 23):  "Autumnal equinox",     # 00:06 UTC
    datetime.date(2026, 12, 21): "Winter solstice",      # 20:50 UTC

    # 2027
    datetime.date(2027, 3, 20):  "Vernal equinox",       # 20:25 UTC
    datetime.date(2027, 6, 21):  "Summer solstice",      # 14:11 UTC
    datetime.date(2027, 9, 23):  "Autumnal equinox",     # 06:02 UTC
    datetime.date(2027, 12, 22): "Winter solstice",      # 02:43 UTC

    # 2028
    datetime.date(2028, 3, 20):  "Vernal equinox",       # 02:17 UTC
    datetime.date(2028, 6, 20):  "Summer solstice",      # 20:02 UTC
    datetime.date(2028, 9, 22):  "Autumnal equinox",     # 11:45 UTC
    datetime.date(2028, 12, 21): "Winter solstice",      # 08:20 UTC
}


# ---------------------------------------------------------------------------
# Supermoons — full moons near perigee. Keyed by exact date.
# ---------------------------------------------------------------------------
SUPERMOONS: dict[datetime.date, str] = {
    # 2025
    datetime.date(2025, 10, 7):  "Supermoon",
    datetime.date(2025, 11, 5):  "Supermoon",
    datetime.date(2025, 12, 4):  "Supermoon",

    # 2026
    datetime.date(2026, 1, 3):   "Supermoon",
    datetime.date(2026, 11, 24): "Supermoon",
    datetime.date(2026, 12, 24): "Supermoon",            # Christmas Eve supermoon

    # 2027
    datetime.date(2027, 1, 22):  "Supermoon",
    datetime.date(2027, 2, 20):  "Supermoon",

    # 2028
    datetime.date(2028, 1, 12):  "Supermoon",
    datetime.date(2028, 2, 10):  "Supermoon",
    datetime.date(2028, 3, 11):  "Supermoon",
    datetime.date(2028, 12, 31): "Supermoon",            # NYE blood supermoon
}


# ---------------------------------------------------------------------------
# Other notable events — conjunctions, comets, oppositions, etc.
# Keyed by exact date -> (description, visible_from_denmark: bool).
# ---------------------------------------------------------------------------
NOTABLE_EVENTS: dict[datetime.date, tuple[str, bool]] = {
    # 2025
    datetime.date(2025, 1, 16):  ("Mars at opposition", True),
    datetime.date(2025, 3, 23):  ("Venus dual visibility", True),   # visible morning & evening from N latitudes
    datetime.date(2025, 9, 21):  ("Saturn at opposition", True),

    # 2026
    datetime.date(2026, 3, 8):   ("Venus-Saturn conjunct", True),   # ~1 degree apart
    datetime.date(2026, 6, 9):   ("Venus-Jupiter conjunct", True),  # ~1 degree apart
    datetime.date(2026, 10, 15): ("Saturn at opposition", True),
    datetime.date(2026, 11, 21): ("Jupiter at opposition", True),

    # 2027
    datetime.date(2027, 1, 18):  ("Mars at opposition", True),
    datetime.date(2027, 7, 1):   ("Venus-Mercury conjunct", True),  # first of triple conjunction
    datetime.date(2027, 8, 11):  ("Venus-Mercury conjunct", True),  # second meeting
    datetime.date(2027, 10, 10): ("Venus-Mercury conjunct", True),  # third meeting

    # 2028
    datetime.date(2028, 3, 12):  ("Jupiter at opposition", True),
    datetime.date(2028, 5, 13):  ("Mars at opposition", True),
}


# ---------------------------------------------------------------------------
# Helper functions to query events for a given set of months
# ---------------------------------------------------------------------------

def get_eclipses_for_months(
    months: list[tuple[int, int]],
    denmark_only: bool = False,
) -> dict[datetime.date, str]:
    """Return eclipses for the given (year, month) pairs.

    If denmark_only is True, only return eclipses visible from Denmark
    (including partial visibility).
    """
    month_set = set(months)
    result: dict[datetime.date, str] = {}
    for date, _etype, desc, visible_dk in ECLIPSES:
        if (date.year, date.month) not in month_set:
            continue
        if denmark_only and not visible_dk:
            continue
        result[date] = desc
    return result


def get_meteor_showers_for_months(
    months: list[tuple[int, int]],
) -> dict[datetime.date, str]:
    """Return meteor shower peaks that fall within the given months.

    Since meteor showers recur annually on roughly the same date,
    this creates entries for each year present in the months list.
    """
    result: dict[datetime.date, str] = {}
    for (y, m) in months:
        for (sm, sd), desc in METEOR_SHOWERS.items():
            if sm == m:
                result[datetime.date(y, sm, sd)] = desc
    return result


def get_solstices_equinoxes_for_months(
    months: list[tuple[int, int]],
) -> dict[datetime.date, str]:
    """Return solstices/equinoxes for the given (year, month) pairs."""
    month_set = set(months)
    return {
        d: desc
        for d, desc in SOLSTICES_EQUINOXES.items()
        if (d.year, d.month) in month_set
    }


def get_supermoons_for_months(
    months: list[tuple[int, int]],
) -> dict[datetime.date, str]:
    """Return supermoons for the given (year, month) pairs."""
    month_set = set(months)
    return {
        d: desc
        for d, desc in SUPERMOONS.items()
        if (d.year, d.month) in month_set
    }


def get_notable_events_for_months(
    months: list[tuple[int, int]],
    denmark_only: bool = False,
) -> dict[datetime.date, str]:
    """Return notable astronomical events for the given months."""
    month_set = set(months)
    result: dict[datetime.date, str] = {}
    for date, (desc, visible_dk) in NOTABLE_EVENTS.items():
        if (date.year, date.month) not in month_set:
            continue
        if denmark_only and not visible_dk:
            continue
        result[date] = desc
    return result


def get_all_astro_events_for_months(
    months: list[tuple[int, int]],
    denmark_only: bool = True,
) -> dict[datetime.date, str]:
    """Return all astronomical events merged into one dict.

    Priority order when dates collide (first wins):
      eclipses > solstices/equinoxes > supermoons > notable > meteor showers
    """
    merged: dict[datetime.date, str] = {}

    # Lowest priority first, higher priority overwrites
    for d, desc in get_meteor_showers_for_months(months).items():
        merged[d] = desc
    for d, desc in get_notable_events_for_months(months, denmark_only).items():
        merged[d] = desc
    for d, desc in get_supermoons_for_months(months).items():
        merged[d] = desc
    for d, desc in get_solstices_equinoxes_for_months(months).items():
        merged[d] = desc
    for d, desc in get_eclipses_for_months(months, denmark_only).items():
        merged[d] = desc

    return merged
