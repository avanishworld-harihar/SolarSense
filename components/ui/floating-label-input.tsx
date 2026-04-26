"use client";

import { cn } from "@/lib/utils";
import { useId, useMemo, useState, type InputHTMLAttributes, type SelectHTMLAttributes } from "react";

type FloatingShellProps = {
  label: string;
  id?: string;
  required?: boolean;
  className?: string;
  containerClassName?: string;
  labelBackgroundClassName?: string;
};

type FloatingInputProps = FloatingShellProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "className" | "children">;

type FloatingSelectProps = FloatingShellProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, "id" | "className">;

function hasNonEmptyValue(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return String(value).trim().length > 0;
}

function FloatingLabel({
  htmlFor,
  label,
  active,
  labelBackgroundClassName
}: {
  htmlFor: string;
  label: string;
  active: boolean;
  labelBackgroundClassName?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        "pointer-events-none absolute left-3 z-20 whitespace-nowrap leading-none transition-all duration-200",
        "top-0 -translate-y-1/2 px-1 text-[11px] font-semibold",
        labelBackgroundClassName ?? "bg-[hsl(var(--card))] dark:bg-[#161B22]",
        active ? "text-teal-600 dark:text-teal-300" : "top-1/2 -translate-y-1/2 px-0 text-sm text-slate-500 dark:text-[#94A3B8]"
      )}
    >
      {label}
    </label>
  );
}

export function FloatingLabelInput({
  label,
  id,
  className,
  containerClassName,
  labelBackgroundClassName,
  required,
  value,
  defaultValue,
  onFocus,
  onBlur,
  onChange,
  ...props
}: FloatingInputProps) {
  const generatedId = useId();
  const fieldId = id ?? `fld-${generatedId}`;
  const [focused, setFocused] = useState(false);
  const [localValue, setLocalValue] = useState<string>(String(defaultValue ?? ""));
  const controlled = value !== undefined;
  const currentValue = controlled ? value : localValue;
  const floated = focused || hasNonEmptyValue(currentValue);

  return (
    <div className={cn("relative w-full overflow-visible", containerClassName)}>
      <FloatingLabel
        htmlFor={fieldId}
        label={`${label}${required ? " *" : ""}`}
        active={floated}
        labelBackgroundClassName={labelBackgroundClassName}
      />
      <input
        id={fieldId}
        value={value}
        defaultValue={defaultValue}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        onChange={(e) => {
          if (!controlled) setLocalValue(e.target.value);
          onChange?.(e);
        }}
        placeholder=" "
        className={cn(
          "ss-input pt-4",
          "placeholder:text-transparent",
          "focus:border-teal-500 focus:ring-teal-200/70 dark:focus:border-teal-400 dark:focus:ring-teal-400/30",
          className
        )}
        {...props}
      />
    </div>
  );
}

export function FloatingLabelSelect({
  label,
  id,
  className,
  containerClassName,
  labelBackgroundClassName,
  required,
  value,
  defaultValue,
  onFocus,
  onBlur,
  onChange,
  children,
  ...props
}: FloatingSelectProps) {
  const generatedId = useId();
  const fieldId = id ?? `fld-${generatedId}`;
  const [focused, setFocused] = useState(false);
  const [localValue, setLocalValue] = useState<string>(String(defaultValue ?? ""));
  const controlled = value !== undefined;
  const currentValue = useMemo(() => (controlled ? value : localValue), [controlled, value, localValue]);
  const floated = focused || hasNonEmptyValue(currentValue);

  return (
    <div className={cn("relative w-full overflow-visible", containerClassName)}>
      <FloatingLabel
        htmlFor={fieldId}
        label={`${label}${required ? " *" : ""}`}
        active={floated}
        labelBackgroundClassName={labelBackgroundClassName}
      />
      <select
        id={fieldId}
        value={value}
        defaultValue={defaultValue}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        onChange={(e) => {
          if (!controlled) setLocalValue(e.target.value);
          onChange?.(e);
        }}
        className={cn(
          "ss-select pt-4",
          "focus:border-teal-500 focus:ring-teal-200/70 dark:focus:border-teal-400 dark:focus:ring-teal-400/30",
          className
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
