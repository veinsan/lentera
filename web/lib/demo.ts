// Seeded demo accounts (api/scripts/seed_demo_users.py), signed in with one click. The shared password lives in
// DEMO_PASSWORD on the server only; the browser sends a role key, never a credential.
import type { Role } from "@/lib/auth";

export type DemoRole = {
  key: "koordinator" | "konselor" | "admin";
  role: Role;
  email: string;
  label: string;
  shortcut: string; // Alt + this key on the sign-in page
  does: string;
  scope: string;
};

export const DEMO_ROLES: DemoRole[] = [
  {
    key: "koordinator",
    role: "coordinator",
    email: "koordinator.demo@lentera.test",
    label: "Koordinator",
    shortcut: "1",
    does: "Mengunggah kohort minggu ke-4, menyusun rencana kapasitas konselor, membaca insight course.",
    scope: "Semua modul",
  },
  {
    key: "konselor",
    role: "advisor",
    email: "konselor.demo@lentera.test",
    label: "Konselor",
    shortcut: "2",
    does: "Menghubungi mahasiswa dari daftar prioritas, membuka profil, mencatat hasil kontak.",
    scope: "M03 dan M06 saja",
  },
  {
    key: "admin",
    role: "admin",
    email: "admin.demo@lentera.test",
    label: "Admin",
    shortcut: "3",
    does: "Melihat semua modul, model card, drift data, dan kesehatan API.",
    scope: "Semua modul",
  },
];

export const demoRole = (key: string) => DEMO_ROLES.find((r) => r.key === key);
