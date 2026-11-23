import Link from "next/link";
import { buttonVariants, type ButtonVariants } from "@heroui/styles";

/** A Next.js link dressed as a HeroUI button (the plain tv() function, safe in server components). */
export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: Omit<React.ComponentProps<typeof Link>, "className"> & ButtonVariants & { className?: string }) {
  return (
    <Link href={href} className={buttonVariants({ variant, size, className })} {...rest}>
      {children}
    </Link>
  );
}
