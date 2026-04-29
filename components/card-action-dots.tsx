"use client";

import { cn } from "@/lib/utils";

type CardActionDotsProps = {
  className?: string;
  editAriaLabel: string;
  deleteAriaLabel: string;
  onEdit?: () => void;
  onDelete?: () => void;
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
  onDelete
}: CardActionDotsProps) {
  if (!onEdit && !onDelete) return null;
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
