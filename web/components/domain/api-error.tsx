import { EmptyState } from "@/components/domain/empty-state";

export function ApiError() {
  return (
    <EmptyState
      art="missing"
      title="API model belum menjawab"
      description="Data halaman ini dihitung oleh API Lentera. Jika API baru bangun dari kondisi tidur, muat ulang halaman dalam beberapa detik; jika masih gagal, periksa bahwa API berjalan dan API_URL benar."
    />
  );
}
