import { Suspense } from "react";
import SiteHeader from "@/components/site/SiteHeader";
import styles from "./hub.module.css";

export function generateStaticParams() {
  return [{ track: "deca" }, { track: "fbla" }];
}

// The track comes from the URL, so it is read inside Suspense: the shared shell stays instant
// and the header streams in with the right competition highlighted.
async function TrackHeader({ params }: { params: LayoutProps<"/[track]">["params"] }) {
  const { track } = await params;
  return <SiteHeader track={track === "fbla" ? "fbla" : "deca"} />;
}

export default function TrackLayout({ children, params }: LayoutProps<"/[track]">) {
  return (
    <>
      <Suspense fallback={<div className={styles.headerShell} />}>
        <TrackHeader params={params} />
      </Suspense>
      <main className={styles.main}>{children}</main>
      <footer className={styles.footer}>
        Glass2Go is an independent student project. It is not affiliated with DECA Inc., FBLA or FBL Canada,
        and every question and scenario here is original practice material.
      </footer>
    </>
  );
}
