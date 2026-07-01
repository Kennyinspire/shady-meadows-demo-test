/**
 * bookings.ts — API-based test data helpers
 *
 * Creates and tears down bookings via the Restful Booker API so that
 * E2E tests start from a known, repeatable state without relying on
 * whatever data happens to be in the environment.
 */

const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
const RAW_API_BASE = env.API_BASE_URL ?? 'https://automationintesting.online';
const API_BASE = RAW_API_BASE.endsWith('/api')
  ? RAW_API_BASE
  : `${RAW_API_BASE.replace(/\/$/, '')}/api`;
const ADMIN_USERNAME = env.ADMIN_USERNAME ?? 'admin';
const ADMIN_PASSWORD = env.ADMIN_PASSWORD ?? 'password';

export interface BookingDates {
  checkin: string;   // YYYY-MM-DD
  checkout: string;  // YYYY-MM-DD
}

export interface Booking {
  bookingid: number;
  firstname: string;
  lastname: string;
  totalprice: number;
  depositpaid: boolean;
  bookingdates: BookingDates;
}

/** Obtain an admin auth token for write operations. */
export async function getAuthToken(): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD }),
  });

  if (!res.ok) {
    throw new Error(`Auth failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json() as { token: string };
  return data.token;
}

/**
 * Create a booking via the API.
 * Uses the AUTOTEST_ prefix so test data is easily identifiable.
 */
export async function createBooking(dates: BookingDates): Promise<Booking> {
  const res = await fetch(`${API_BASE}/booking/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstname: 'AUTOTEST',
      lastname: 'User',
      totalprice: 100,
      depositpaid: true,
      bookingdates: dates,
      additionalneeds: 'QA automation test booking — safe to delete',
    }),
  });

  if (!res.ok) {
    throw new Error(`Create booking failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json() as { bookingid: number; booking: Omit<Booking, 'bookingid'> };
  return { bookingid: data.bookingid, ...data.booking };
}

/** Delete a booking by ID. Requires a valid auth token. */
export async function deleteBooking(bookingId: number, token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/booking/${bookingId}`, {
    method: 'DELETE',
    headers: { Cookie: `token=${token}` },
  });

  // 201 is the success status for DELETE on this API (non-standard but documented)
  if (res.status !== 201 && res.status !== 200) {
    console.warn(`Delete booking ${bookingId} returned ${res.status} — may already be deleted`);
  }
}

/** Helper: returns today's date + offset as YYYY-MM-DD */
export function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0];
}

/** Helper: format a YYYY-MM-DD date as DD/MM/YYYY for the UI date picker */
export function toUiDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}
