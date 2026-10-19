// Server-only: checks the scheduler's `Authorization: Bearer $CRON_SECRET` header.
import { timingSafeEqual } from "node:crypto";

export function authorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
