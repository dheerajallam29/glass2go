import Link from "next/link";
import Logo from "@/components/site/Logo";
import AccountButton from "@/components/site/AccountButton";
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
          <Link href="/deca" className={styles.navItem}>
            DECA
          </Link>
          <Link href="/fbla" className={styles.navItem}>
            FBLA
          </Link>
          <AccountButton className={styles.navItem} signClassName={styles.signItem} avatarClassName={styles.avatarItem} />
        </nav>
      </header>
      <GlassFlight />
    </main>
  );
}
