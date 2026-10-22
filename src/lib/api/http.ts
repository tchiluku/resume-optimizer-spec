/** Rejects state-changing requests without a matching Origin (SEC-SESS-04). */
export function originAllowed(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** The visitor's IP as reported by the hosting proxy (Vercel sets x-forwarded-for). */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store", ...headers } });
}

export function errorResponse(status: number, code: string, message: string, headers: Record<string, string> = {}): Response {
  return json({ error: { code, message } }, status, headers);
}

export const FORBIDDEN_MESSAGE = "This request is missing a valid same-origin check and was blocked.";
