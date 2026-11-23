import { EmptyState } from "@/components/domain/empty-state";

export function ApiError() {
  return (
    <EmptyState
      art="missing"
      title="API model belum menjawab"
      description="Data halaman ini dihitung oleh API Lentera. Jika API baru bangun dari kondisi tidur, muat ulang halaman dalam beberapa detik. Jika masih gagal, pastikan API berjalan dan API_URL benar."
    />
  );
}
