"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type CardActionDotsProps = {
  className?: string;
  editAriaLabel: string;
  deleteAriaLabel: string;
  onEdit?: () => void;
  onDelete?: () => void;
  interaction?: "direct" | "menu";
  editText?: string;
  deleteText?: string;
};

/**
 * Minimal “traffic light” actions (Apple-style): two dots, stronger on card
 * hover or when hovering the dot itself.
 */
export function CardActionDots({
  className,
  editAriaLabel,
  deleteAriaLabel,
  onEdit,
  onDelete,
  interaction = "direct",
  editText = "Edit",
  deleteText = "Delete"
}: CardActionDotsProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const root = rootRef.current;
      if (!root) return;
      if (root.contains(event.target as Node)) return;
      setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  if (!onEdit && !onDelete) return null;

  if (interaction === "menu") {
    return (
      <div
        ref={rootRef}
        role="toolbar"
        aria-label="Card actions"
        className={cn("pointer-events-auto relative", className)}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Open card actions"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/80 px-2 py-1 shadow-sm backdrop-blur-sm transition hover:bg-white"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 opacity-90" />
          <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-rose-500 to-red-600 opacity-90" />
        </button>

        {open ? (
          <div className="absolute right-0 top-[calc(100%+0.35rem)] z-30 min-w-28 rounded-xl border border-white/70 bg-white/95 p-1.5 shadow-lg backdrop-blur">
            {onEdit ? (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onEdit();
                }}
                className="block w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-slate-700 transition hover:bg-sky-50"
                aria-label={editAriaLabel}
              >
                {editText}
              </button>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onDelete();
                }}
                className="block w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                aria-label={deleteAriaLabel}
              >
                {deleteText}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      role="toolbar"
      aria-label="Card actions"
      className={cn("pointer-events-auto flex items-center gap-1.5", className)}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {onEdit ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="rounded-full p-2 outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2"
          aria-label={editAriaLabel}
        >
          <span
            className={cn(
              "block h-2.5 w-2.5 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 shadow-[0_0_0_1px_rgba(255,255,255,0.35)]",
              "opacity-[0.42] transition-[opacity,transform,box-shadow] duration-200",
              "group-hover/card:opacity-100 group-hover/card:shadow-md",
              "hover:scale-125 hover:opacity-100"
            )}
          />
        </button>
      ) : null}
      {onDelete ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="rounded-full p-2 outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-rose-400/80 focus-visible:ring-offset-2"
          aria-label={deleteAriaLabel}
        >
          <span
            className={cn(
              "block h-2.5 w-2.5 rounded-full bg-gradient-to-br from-rose-500 to-red-600 shadow-[0_0_0_1px_rgba(255,255,255,0.35)]",
              "opacity-[0.42] transition-[opacity,transform,box-shadow] duration-200",
              "group-hover/card:opacity-100 group-hover/card:shadow-md",
              "hover:scale-125 hover:opacity-100"
            )}
          />
        </button>
      ) : null}
    </div>
  );
}
