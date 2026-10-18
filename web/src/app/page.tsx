import Link from "next/link";
import Logo from "@/components/site/Logo";
import GlassFlight from "@/components/home/GlassFlight";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main>
      <header className={styles.bar}>
        <Link href="/" className={styles.mark} aria-label="Glass2Go home">
          <Logo size={24} />
          <span>Glass2Go</span>
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
