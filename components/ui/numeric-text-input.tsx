"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  /** Committed numeric value (undefined = not set) */
  value?: number;
  /** Shown when value is unset and field is empty */
  fallback?: number;
  onValueChange: (next: number | undefined) => void;
  /** Whole numbers only (no decimal point) */
  integer?: boolean;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  "aria-label"?: string;
};

const DECIMAL_RE = /^[0-9]*\.?[0-9]*$/;
const INTEGER_RE = /^[0-9]*$/;

/**
 * Text-based numeric field — avoids browser `type="number"` quirks and
 * controlled-input fallbacks that block deleting digits (e.g. last "1" in 60).
 */
export function NumericTextInput({
  value,
  fallback,
  onValueChange,
  integer = false,
  className,
  placeholder,
  disabled,
  "aria-label": ariaLabel,
}: Props) {
  const [draft, setDraft] = useState<string | null>(null);

  const committed =
    value !== undefined && value !== null && Number.isFinite(value) ? String(value) : "";
  const display =
    draft !== null ? draft : committed !== "" ? committed : "";

  const placeholderText =
    placeholder ?? (fallback !== undefined && display === "" ? String(fallback) : undefined);

  return (
    <input
      type="text"
      inputMode={integer ? "numeric" : "decimal"}
      disabled={disabled}
      aria-label={ariaLabel}
      placeholder={placeholderText}
      value={display}
      onChange={(e) => {
        const raw = e.target.value;
        const re = integer ? INTEGER_RE : DECIMAL_RE;
        if (raw !== "" && !re.test(raw)) return;
        setDraft(raw);
      }}
      onBlur={() => {
        const raw = draft ?? display;
        setDraft(null);
        if (raw === "" || raw === ".") {
          onValueChange(undefined);
          return;
        }
        const n = integer ? parseInt(raw, 10) : parseFloat(raw);
        onValueChange(Number.isFinite(n) ? n : undefined);
      }}
      className={cn(className)}
    />
  );
}
