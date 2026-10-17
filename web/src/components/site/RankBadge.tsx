"use client";

import { useSyncExternalStore } from "react";
import { correctCount, onProgress, rankFor } from "@/lib/progress";
import styles from "./Site.module.css";

export default function RankBadge() {
  const count = useSyncExternalStore(onProgress, correctCount, () => 0);
  const { rank, next, toNext } = rankFor(count);
  return (
    <span className={styles.rank} title={next ? `${toNext} more correct to reach ${next}` : "Top rank"}>
      <span className={styles.rankName} data-rank={rank}>{rank}</span>
      <span className={styles.rankCount}>{count} correct</span>
    </span>
  );
}
