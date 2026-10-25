"use client";

import { useEffect, useRef, useState } from "react";
import { authEnabled, signInWithGoogle, signOut, useAuth } from "@/lib/auth";
import styles from "./Site.module.css";

const SHOW = authEnabled || process.env.NODE_ENV !== "production";
const SYNC_LABEL = { idle: "", syncing: "Saving…", synced: "Progress saved to your account", error: "Could not save. Will retry on your next answer." } as const;

type Props = { className?: string; signClassName?: string; avatarClassName?: string };

export default function AccountButton({ className, signClassName, avatarClassName }: Props = {}) {
  const { user, ready, sync } = useAuth();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    addEventListener("mousedown", close);
    addEventListener("keydown", close);
    return () => {
      removeEventListener("mousedown", close);
      removeEventListener("keydown", close);
    };
  }, [open]);

  if (!SHOW) return null;

  if (!user) {
    return (
      <div className={styles.account} ref={box}>
        <button
          className={className ? `${className} ${signClassName ?? ""}` : styles.signIn}
          onClick={() => (authEnabled ? void signInWithGoogle() : setOpen((o) => !o))}
          disabled={authEnabled && !ready}
        >
          Sign in
        </button>
        {open && !authEnabled && (
          <div className={styles.accountMenu} role="status">
            <p>Sign-in is built but not switched on yet. Add the Supabase keys from SETUP-SIGNIN.md to turn it on. Your progress is saved on this device in the meantime.</p>
          </div>
        )}
      </div>
    );
  }

  const initial = (user.name || user.email || "?").trim()[0]?.toUpperCase();
  return (
    <div className={styles.account} ref={box}>
      <button className={className ? `${className} ${avatarClassName ?? ""}` : styles.avatar} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={`Account: ${user.name}`}>
        {user.avatar ? <img src={user.avatar} alt="" referrerPolicy="no-referrer" /> : initial}
      </button>
      {open && (
        <div className={styles.accountMenu}>
          <strong>{user.name}</strong>
          <span className={styles.accountEmail}>{user.email}</span>
          {SYNC_LABEL[sync] && <span className={styles.accountSync} data-state={sync}>{SYNC_LABEL[sync]}</span>}
          <button className={styles.signOut} onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
