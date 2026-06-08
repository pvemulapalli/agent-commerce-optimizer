"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { trackContactClicked } from "@/lib/analytics-events";

export function ContactLink({
  href = "/contact",
  location,
  className,
  children,
  onClick,
}: {
  href?: string;
  location: "header" | "footer" | "mobile_nav";
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        trackContactClicked(location);
        onClick?.();
      }}
    >
      {children}
    </Link>
  );
}
