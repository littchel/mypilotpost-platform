// Phase 1 auth utilities (stubs)

export function generateToken() {
  return crypto.randomUUID();
}

export function verifyPassword() {
  throw new Error("verifyPassword not implemented in Phase 1");
}

export function nowISO() {
  return new Date().toISOString();
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export async function hashPassword() {
  throw new Error("hashPassword not implemented in Phase 1");
}
