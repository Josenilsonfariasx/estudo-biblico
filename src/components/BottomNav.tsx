"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Ellipsis, House, Sprout } from "lucide-react";
import styles from "./BottomNav.module.css";

// `match`: telas internas que pertencem a cada aba.
const TABS = [
  { href: "/", label: "Hoje", icon: House, match: ["/revisao"] },
  { href: "/plano", label: "Plano", icon: BookOpen, match: ["/fase", "/capitulo"] },
  { href: "/sementes", label: "Sementes", icon: Sprout, match: ["/mensagem"] },
  { href: "/mais", label: "Mais", icon: Ellipsis, match: ["/historico"] },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className={styles.nav}>
      {TABS.map(({ href, label, icon: Icon, match }) => {
        const active = (href === "/" ? pathname === "/" : pathname.startsWith(href)) || match.some((m) => pathname.startsWith(m));
        return (
          <Link
            key={href}
            href={href}
            className={`${styles.tab} ${active ? styles.active : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={22} strokeWidth={active ? 2 : 1.6} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
