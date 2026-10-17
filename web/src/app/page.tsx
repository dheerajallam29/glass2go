import Link from "next/link";
import GlassFlight from "@/components/home/GlassFlight";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main>
      <header className={styles.bar}>
        <Link href="/" className={styles.mark} aria-label="Glass2Go home">
          Glass2Go
        </Link>
        <nav className={styles.skip} aria-label="Go straight to">
          <Link href="/deca">DECA</Link>
          <Link href="/fbla">FBLA</Link>
        </nav>
      </header>
      <GlassFlight />
    </main>
  );
}
