const WEEKDAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const PERIOD_HOUR: Record<string, number> = {
  morning: 9,
  afternoon: 14,
  evening: 18,
  night: 20,
};

const NAIROBI_OFFSET_MS = 3 * 60 * 60 * 1000;

/** Matches "Monday morning", "by Monday morning", "for tomorrow afternoon", etc. */
const NEEDED_BY_PATTERN =
  /\b(?:(?:by|for|on)\s+)?((?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+(?:morning|afternoon|evening|night))?|tomorrow(?:\s+(?:morning|afternoon|evening|night))?|\d{1,2}\s*(?:am|pm))\b/i;

export type NeededByResolution = {
  label: string;
  neededByMs: number;
};

type ParsedNeededBy = {
  hour: number;
  isTomorrow?: boolean;
  minute: number;
  periodLabel?: string;
  weekday?: number;
};

function titleCasePhrase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function parseClockToken(token: string): { hour: number; minute: number } | null {
  const match = token.trim().match(/^(\d{1,2})\s*(am|pm)$/i);
  if (!match?.[1] || !match[2]) {
    return null;
  }

  let hour = Number(match[1]);
  if (!Number.isInteger(hour) || hour < 1 || hour > 12) {
    return null;
  }

  const meridiem = match[2].toLowerCase();
  if (meridiem === "am") {
    if (hour === 12) hour = 0;
  } else if (hour !== 12) {
    hour += 12;
  }

  return { hour, minute: 0 };
}

function parseNeededByPhrase(raw: string): ParsedNeededBy | null {
  const trimmed = raw.trim().toLowerCase();
  if (trimmed.length === 0) {
    return null;
  }

  const clock = parseClockToken(trimmed);
  if (clock) {
    return { ...clock };
  }

  const parts = trimmed.split(/\s+/);
  const head = parts[0];
  if (!head) {
    return null;
  }

  const periodToken = parts[1];
  const periodHour =
    periodToken && periodToken in PERIOD_HOUR
      ? PERIOD_HOUR[periodToken]
      : undefined;
  const hour = periodHour ?? PERIOD_HOUR.morning!;
  const periodLabel = periodHour !== undefined ? periodToken : "morning";

  if (head === "tomorrow") {
    return {
      hour,
      isTomorrow: true,
      minute: 0,
      periodLabel,
    };
  }

  const weekday = WEEKDAY_INDEX[head];
  if (weekday === undefined) {
    return null;
  }

  return {
    hour,
    minute: 0,
    periodLabel,
    weekday,
  };
}

function nairobiYmd(nowMs: number): {
  day: number;
  dow: number;
  month: number;
  year: number;
} {
  // Nairobi is permanently UTC+3 (no DST).
  const shifted = new Date(nowMs + NAIROBI_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    dow: shifted.getUTCDay(),
  };
}

function nairobiWallToUtcMs(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): number {
  return Date.UTC(year, month - 1, day, hour - 3, minute, 0, 0);
}

function addDaysYmd(
  year: number,
  month: number,
  day: number,
  days: number,
): { day: number; month: number; year: number } {
  const utc = Date.UTC(year, month - 1, day + days);
  const date = new Date(utc);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function resolveParsedNeededByMs(
  parsed: ParsedNeededBy,
  nowMs: number,
): number | undefined {
  const today = nairobiYmd(nowMs);

  if (parsed.isTomorrow) {
    const tomorrow = addDaysYmd(today.year, today.month, today.day, 1);
    return nairobiWallToUtcMs(
      tomorrow.year,
      tomorrow.month,
      tomorrow.day,
      parsed.hour,
      parsed.minute,
    );
  }

  if (parsed.weekday !== undefined) {
    let delta = (parsed.weekday - today.dow + 7) % 7;
    const candidateSameDay = nairobiWallToUtcMs(
      today.year,
      today.month,
      today.day,
      parsed.hour,
      parsed.minute,
    );

    // If that weekday is today but the slot already passed, roll to next week.
    if (delta === 0 && candidateSameDay <= nowMs) {
      delta = 7;
    }

    const target = addDaysYmd(today.year, today.month, today.day, delta);
    return nairobiWallToUtcMs(
      target.year,
      target.month,
      target.day,
      parsed.hour,
      parsed.minute,
    );
  }

  // Bare clock time ("9am") → next occurrence today or tomorrow in Nairobi.
  const todayAt = nairobiWallToUtcMs(
    today.year,
    today.month,
    today.day,
    parsed.hour,
    parsed.minute,
  );
  if (todayAt > nowMs) {
    return todayAt;
  }

  const tomorrow = addDaysYmd(today.year, today.month, today.day, 1);
  return nairobiWallToUtcMs(
    tomorrow.year,
    tomorrow.month,
    tomorrow.day,
    parsed.hour,
    parsed.minute,
  );
}

export function extractNeededByLabel(text: string): string | undefined {
  const match = text.match(NEEDED_BY_PATTERN);
  if (!match?.[1]) {
    return undefined;
  }

  return titleCasePhrase(match[1]);
}

/** Resolve a free-text needed-by phrase (or label) to a concrete Nairobi timestamp. */
export function resolveNeededByMs(
  labelOrText: string,
  nowMs = Date.now(),
): number | undefined {
  const label = extractNeededByLabel(labelOrText) ?? labelOrText.trim();
  const parsed = parseNeededByPhrase(label);
  if (!parsed) {
    return undefined;
  }

  return resolveParsedNeededByMs(parsed, nowMs);
}

export function resolveNeededByFromText(
  text: string,
  nowMs = Date.now(),
): NeededByResolution | undefined {
  const label = extractNeededByLabel(text);
  if (!label) {
    return undefined;
  }

  const neededByMs = resolveNeededByMs(label, nowMs);
  if (neededByMs === undefined) {
    return undefined;
  }

  return { label, neededByMs };
}
