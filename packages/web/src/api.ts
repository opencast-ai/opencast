export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3001";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(`Invalid JSON response (status ${res.status})`, res.status);
  }
}

export async function apiGet<T>(path: string, opts?: { apiKey?: string; adminToken?: string }) {
  const headers: Record<string, string> = {};
  if (opts?.apiKey) headers["x-api-key"] = opts.apiKey;
  if (opts?.adminToken) headers["x-admin-token"] = opts.adminToken;

  const res = await fetch(`${API_URL}${path}`, { headers });
  const json = await parseJson<any>(res);
  if (!res.ok) {
    const msg = typeof json?.error?.message === "string" ? json.error.message : `Request failed (${res.status})`;
    throw new ApiError(msg, res.status);
  }
  return json as T;
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  opts?: { apiKey?: string; adminToken?: string }
): Promise<T> {
  const headers: Record<string, string> = {
    "content-type": "application/json"
  };
  if (opts?.apiKey) headers["x-api-key"] = opts.apiKey;
  if (opts?.adminToken) headers["x-admin-token"] = opts.adminToken;

  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });
  const json = await parseJson<any>(res);
  if (!res.ok) {
    const msg = typeof json?.error?.message === "string" ? json.error.message : `Request failed (${res.status})`;
    throw new ApiError(msg, res.status);
  }
  return json as T;
}
