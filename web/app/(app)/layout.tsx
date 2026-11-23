import { Sidebar } from "@/components/layout/sidebar";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Sidebar />
      <main className="min-h-screen p-4 sm:p-6 lg:ml-60 lg:p-8">{children}</main>
    </>
  );
}
