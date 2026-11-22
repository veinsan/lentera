import { CloudOff } from "lucide-react";
import { EmptyState } from "@/components/domain/empty-state";

export function ApiError() {
  return (
    <EmptyState
      icon={CloudOff}
      title="API model tidak dapat dihubungi"
      description="Data halaman ini berasal dari API Lentera. Pastikan API berjalan dan API_URL mengarah ke alamat yang benar."
    />
  );
}
