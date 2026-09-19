// SQLite has no native Json/array column type (see schema.prisma's
// datasource comment) — every field that used to be Json or String[] is
// now a String column holding JSON text. These two helpers are the only
// place that (de)serializes it, so every call site does the same thing
// the same way rather than each service inventing its own JSON.parse.
export function toJsonField(value: unknown): string {
  return JSON.stringify(value ?? null);
}

export function fromJsonField<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
