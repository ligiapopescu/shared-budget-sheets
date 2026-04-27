// Numeric parsing helpers for sheet cell values.
//
// Sheets stores everything as a string. parseFloat / parseInt silently
// return NaN for malformed values, which then propagates as `0` through
// `|| 0` defaults — the user sees a plausible number where they should
// see an error. These helpers warn (once per "context" string) when a
// non-empty cell fails to parse, so corrupt data surfaces in the console.

const warned = new Set<string>();

function warnOnce(context: string, raw: string) {
  const key = `${context}:${raw}`;
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`[parsing] ${context}: couldn't parse "${raw}" as number; defaulting`);
}

// Float with default. Empty cells silently use the default; non-empty
// cells that fail to parse log a one-time warning.
export function parseFloatCell(raw: string | undefined, fallback: number, context: string): number {
  if (raw == null || raw === '') return fallback;
  const n = parseFloat(raw);
  if (Number.isNaN(n)) {
    warnOnce(context, raw);
    return fallback;
  }
  return n;
}

// Integer with default. Same semantics as parseFloatCell.
export function parseIntCell(raw: string | undefined, fallback: number, context: string): number {
  if (raw == null || raw === '') return fallback;
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) {
    warnOnce(context, raw);
    return fallback;
  }
  return n;
}

// Optional float — returns undefined for empty cells, the parsed number
// otherwise, and undefined (with a warning) for malformed non-empty cells.
export function parseFloatOpt(raw: string | undefined, context: string): number | undefined {
  if (raw == null || raw === '') return undefined;
  const n = parseFloat(raw);
  if (Number.isNaN(n)) {
    warnOnce(context, raw);
    return undefined;
  }
  return n;
}
