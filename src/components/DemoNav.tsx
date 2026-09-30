"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Behind the scenes" },
  { href: "/student", label: "Student experience" },
];

export function DemoNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center rounded-full border border-white/10 bg-white/5 p-0.5 text-base font-medium">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={
              "rounded-full px-3 py-1 transition " +
              (active ? "bg-white text-black" : "text-muted-foreground hover:text-foreground")
            }
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
