import Link from "next/link";
import type { Track } from "@/lib/questions";
import RankBadge from "./RankBadge";
import styles from "./Site.module.css";

export default function SiteHeader({ track }: { track: Track }) {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.mark}>Glass2Go</Link>
      <nav className={styles.switch} aria-label="Competition">
        {(["deca", "fbla"] as const).map((t) => (
          <Link key={t} href={`/${t}`} aria-current={t === track ? "page" : undefined}>
            {t.toUpperCase()}
          </Link>
        ))}
      </nav>
      <RankBadge />
    </header>
  );
}
