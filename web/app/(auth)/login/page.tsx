import type { Metadata } from "next";
import { Lamp } from "lucide-react";
import { LoginForm } from "@/components/domain/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Masuk" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2">
            <Lamp className="size-5 text-brand-accent" aria-hidden />
            <span className="text-lg font-bold">Lentera</span>
          </div>
          <CardTitle>Masuk</CardTitle>
          <CardDescription>Masuk dengan akun Lentera Anda.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
