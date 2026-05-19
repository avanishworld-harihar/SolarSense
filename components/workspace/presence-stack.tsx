"use client";

/**
 * PresenceStack — Wave 4 P9.
 *
 * Lightweight avatar stack showing who is currently viewing this workspace
 * or proposal builder page. Uses Supabase Realtime presence channels.
 *
 * Design rules:
 *   - Avatar stack only — no live cursors, no collaborative editing
 *   - Maximum 5 avatars shown; overflow displayed as "+N"
 *   - Presence is ephemeral — no database writes, no audit trail
 *   - Self-join: current user's avatar is always shown but visually muted
 *   - Channel name pattern: `presence:workspace:{proposalId}`
 *
 * Privacy:
 *   - Only the user's initials and a random color seed are broadcast
 *   - No PII beyond what the user's session already exposes
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PresenceUser = {
  /** Unique key for this session (random uuid generated client-side) */
  key: string;
  /** Display initials — max 2 chars */
  initials: string;
  /** Colour seed — maps to one of 8 avatar palette colours */
  colorSeed: number;
  /** Timestamp of last heartbeat */
  onlineAt: string;
};

// ─── Avatar palette ───────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  { bg: "bg-violet-500",  ring: "ring-violet-400",  text: "text-white" },
  { bg: "bg-blue-500",    ring: "ring-blue-400",    text: "text-white" },
  { bg: "bg-emerald-500", ring: "ring-emerald-400", text: "text-white" },
  { bg: "bg-amber-500",   ring: "ring-amber-400",   text: "text-white" },
  { bg: "bg-rose-500",    ring: "ring-rose-400",    text: "text-white" },
  { bg: "bg-cyan-500",    ring: "ring-cyan-400",    text: "text-white" },
  { bg: "bg-fuchsia-500", ring: "ring-fuchsia-400", text: "text-white" },
  { bg: "bg-teal-500",    ring: "ring-teal-400",    text: "text-white" },
] as const;

function getAvatarColor(seed: number) {
  return AVATAR_COLORS[Math.abs(seed) % AVATAR_COLORS.length];
}

// ─── Session key helper ───────────────────────────────────────────────────────

function getSessionKey(): string {
  if (typeof sessionStorage === "undefined") return Math.random().toString(36).slice(2);
  const KEY = "sol52_presence_session_key";
  let k = sessionStorage.getItem(KEY);
  if (!k) {
    k = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(KEY, k);
  }
  return k;
}

function nameToInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return (parts[0].slice(0, 2)).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase() || "?";
}

function nameToColorSeed(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// ─── Single avatar ────────────────────────────────────────────────────────────

function PresenceAvatar({
  user,
  isSelf,
  index,
}: {
  user: PresenceUser;
  isSelf: boolean;
  index: number;
}) {
  const color = getAvatarColor(user.colorSeed);

  return (
    <motion.div
      key={user.key}
      initial={{ opacity: 0, scale: 0.6, x: 8 }}
      animate={{ opacity: isSelf ? 0.55 : 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.6 }}
      transition={{ duration: 0.2 }}
      title={isSelf ? "You (current session)" : "Viewing this workspace"}
      style={{ zIndex: 10 - index }}
      className={`relative -ml-2 flex h-7 w-7 items-center justify-center rounded-full ring-2 ring-white dark:ring-[#0c1017] ${color.bg} ${color.text} first:ml-0`}
    >
      <span className="text-[10px] font-bold leading-none">{user.initials}</span>
    </motion.div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  /** Channel discriminator — typically the proposal ID */
  proposalId: string;
  /** Current user's display name (for their own avatar initials) */
  userName?: string;
  className?: string;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function PresenceStack({ proposalId, userName = "You", className = "" }: Props) {
  const [peers, setPeers] = useState<PresenceUser[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const sessionKey = useRef(getSessionKey());

  useEffect(() => {
    if (!supabase) return;

    const myInitials = nameToInitials(userName);
    const myColorSeed = nameToColorSeed(userName + sessionKey.current);

    const me: PresenceUser = {
      key: sessionKey.current,
      initials: myInitials,
      colorSeed: myColorSeed,
      onlineAt: new Date().toISOString(),
    };

    const channelName = `presence:workspace:${proposalId}`;
    const channel = supabase.channel(channelName, {
      config: { presence: { key: me.key } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceUser>();
        const users: PresenceUser[] = [];
        for (const presences of Object.values(state)) {
          for (const p of presences as PresenceUser[]) {
            users.push(p);
          }
        }
        setPeers(users);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track(me);
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe().catch(() => undefined);
      channelRef.current = null;
    };
  }, [proposalId, userName]);

  if (peers.length === 0) return null;

  const MAX = 5;
  const shown = peers.slice(0, MAX);
  const overflow = peers.length - MAX;

  return (
    <div className={`flex items-center ${className}`} aria-label={`${peers.length} viewer${peers.length !== 1 ? "s" : ""}`}>
      <AnimatePresence mode="popLayout">
        {shown.map((user, i) => (
          <PresenceAvatar
            key={user.key}
            user={user}
            isSelf={user.key === sessionKey.current}
            index={i}
          />
        ))}
        {overflow > 0 && (
          <motion.div
            key="overflow"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            className="-ml-2 flex h-7 min-w-[1.75rem] items-center justify-center rounded-full bg-slate-200 ring-2 ring-white dark:bg-white/10 dark:ring-[#0c1017]"
          >
            <span className="px-1 text-[10px] font-bold text-slate-600 dark:text-slate-300">
              +{overflow}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
