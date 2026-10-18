"use client";

import Link from "next/link";
import { useState } from "react";
import ExamIcon from "@/components/site/ExamIcon";
import { clustersFor, eventsFor, KINDS, type Kind, type TrackId } from "@/lib/roleplays";
import styles from "./RoleplayHub.module.css";

const ORDER: Kind[] = ["principles", "individual", "team", "pfl", "fbla", "fblaService"];

/** Career clusters as cards. Choosing one opens a drop-down with its role-play events. */
export default function ClusterBrowser({ track = "deca" }: { track?: TrackId }) {
  const [open, setOpen] = useState<string | null>(null);
  const events_ = eventsFor(track);
  return (
    <div className={styles.clusters}>
      {clustersFor(track).map((c) => {
        const events = events_.filter((e) => e.cluster === c.id);
        const isOpen = open === c.id;
        return (
          <section key={c.id} className={styles.cluster} data-open={isOpen || undefined}>
            <button
              type="button"
              className={styles.clusterHead}
              aria-expanded={isOpen}
              aria-controls={`cluster-${c.id}`}
              onClick={() => setOpen(isOpen ? null : c.id)}
            >
              <span className={styles.clusterIcon}>
                <ExamIcon slug={c.icon ?? (c.id === "hospitality" ? "hospitality" : c.id)} size={30} />
              </span>
              <span className={styles.clusterText}>
                <span className={styles.clusterName}>{c.name}</span>
                <span className={styles.clusterBlurb}>{c.blurb}</span>
              </span>
              <svg className={styles.chev} viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
                <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div id={`cluster-${c.id}`} className={styles.drop} data-open={isOpen || undefined} role="region" aria-label={`${c.name} events`}>
              <div className={styles.dropInner}>
                {ORDER.filter((k) => events.some((e) => e.kind === k)).map((k) => (
                  <div key={k} className={styles.kindGroup}>
                    {track === "deca" && <h3 className={styles.kindTitle}>{KINDS[k].label}</h3>}
                    <ul className={styles.eventList}>
                      {events
                        .filter((e) => e.kind === k)
                        .map((e) => (
                          <li key={e.slug}>
                            <Link href={`/${track}/events/${e.slug}`} className={styles.eventRow} tabIndex={isOpen ? 0 : -1}>
                              <span className={styles.abbr}>{e.abbr}</span>
                              <span className={styles.eventName}>{e.name}</span>
                              <span className={styles.eventMeta}>{e.track === "fbla" ? (e.team ? "Solo or team of 3" : "Individual") : KINDS[e.kind].who === "individual" ? "Individual" : "Team of two"}</span>
                              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                                <path d="M3 8h9M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </Link>
                          </li>
                        ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
