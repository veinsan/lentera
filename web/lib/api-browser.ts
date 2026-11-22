// Browser calls to the FastAPI service for file uploads (too large for a Server Action body).
// The API checks the user's Supabase access token; CORS_ORIGINS on the API must list this app's origin.
import { createClient } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type UploadResponse<T> = { status: number; body: T | { detail: string } };

export async function postJson<T>(path: string, body: unknown): Promise<UploadResponse<T>> {
  const { data } = await createClient().auth.getSession();
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: res.status, body: await res.json() };
  } catch {
    return { status: 0, body: { detail: "API model tidak dapat dihubungi." } };
  }
}

export async function postFile<T>(path: string, file: File, fields: Record<string, string> = {}): Promise<UploadResponse<T>> {
  const { data } = await createClient().auth.getSession();
  const form = new FormData();
  form.append("file", file);
  Object.entries(fields).forEach(([k, v]) => form.append(k, v));
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}` },
      body: form,
    });
    return { status: res.status, body: await res.json() };
  } catch {
    return { status: 0, body: { detail: "API model tidak dapat dihubungi." } };
  }
}
