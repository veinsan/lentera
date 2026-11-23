"use server";

import { redirect } from "next/navigation";
import { demoRole } from "@/lib/demo";
import { createClient } from "@/lib/supabase/server";

export type SignInState = { error: string | null };

/** Signs in as a seeded demo role; the password never leaves the server. Also used to switch roles. */
export async function signInAs(key: string): Promise<SignInState> {
  const account = demoRole(key);
  const password = process.env.DEMO_PASSWORD;
  if (!account) return { error: "Peran demo tidak dikenal." };
  if (!password) return { error: "Login demo belum disiapkan di server ini (DEMO_PASSWORD belum diisi)." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: account.email, password });
  if (error) return { error: "Akun demo tidak bisa masuk. Coba lagi sebentar lagi." };
  redirect("/dashboard");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
