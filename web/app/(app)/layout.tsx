import { Sidebar } from "@/components/layout/sidebar";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Sidebar />
      <main className="ml-60 min-h-screen p-8">{children}</main>
    </>
  );
}
