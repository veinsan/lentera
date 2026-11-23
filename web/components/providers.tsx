"use client";

import { useRouter } from "next/navigation";
import { RouterProvider } from "react-aria-components";
import { Toast } from "@heroui/react";

/** React Aria links and table rows navigate through the Next.js router instead of reloading the page. */
export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <RouterProvider navigate={router.push}>
      {children}
      <Toast.Provider placement="bottom end" />
    </RouterProvider>
  );
}
