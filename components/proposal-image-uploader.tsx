"use client";

import { Loader2, Trash2, Upload, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";

/**
 * Sol.52 — Pro-grade image upload widget used in the Proposal Builder
 * Settings panel. Supports two modes:
 *
 *   • mode="logo"  → single image, uploads to /api/company-logo-upload
 *   • mode="sites" → up to 6 images, uploads to /api/site-photo-upload
 *
 * Both endpoints push files to Supabase Storage and return permanent
 * public URLs. The parent component owns the URL state — the uploader
 * is purely a controlled input.
 */

type SingleUploaderProps = {
  mode: "logo";
  value: string;
  onChange: (url: string) => void;
  label?: string;
  hint?: string;
  disabled?: boolean;
};

type MultiUploaderProps = {
  mode: "sites";
  values: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  label?: string;
  hint?: string;
  disabled?: boolean;
};

type UploaderProps = SingleUploaderProps | MultiUploaderProps;

export function ProposalImageUploader(props: UploaderProps) {
  if (props.mode === "logo") return <LogoUploader {...props} />;
  return <SitesUploader {...props} />;
}

// ---------------------------------------------------------------------------
// Logo (single)
// ---------------------------------------------------------------------------

function LogoUploader({ value, onChange, label, hint, disabled }: SingleUploaderProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/company-logo-upload", { method: "POST", body: fd });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !json.ok || !json.url) {
        throw new Error(json.error || `Upload failed (HTTP ${res.status})`);
      }
      onChange(json.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }, [onChange]);

  return (
    <div>
      {label ? (
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</label>
      ) : null}
      <div className="mt-1 flex items-center gap-3">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="logo" className="h-full w-full object-contain" />
          ) : (
            <Upload className="h-5 w-5 text-slate-400" />
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={disabled || busy}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {value ? "Replace logo" : "Upload logo"}
            </button>
            {value ? (
              <button
                type="button"
                onClick={() => onChange("")}
                disabled={disabled}
                className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                title="Remove logo"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </button>
            ) : null}
          </div>
          {hint ? <p className="text-[10px] text-slate-500">{hint}</p> : null}
          {error ? <p className="text-[11px] font-semibold text-rose-700">{error}</p> : null}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sites (multi, up to 6)
// ---------------------------------------------------------------------------

function SitesUploader({ values, onChange, max = 6, label, hint, disabled }: MultiUploaderProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const remaining = Math.max(0, max - values.length);

  const upload = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      for (const f of files.slice(0, remaining)) fd.append("files[]", f);
      const res = await fetch("/api/site-photo-upload", { method: "POST", body: fd });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; urls?: string[]; error?: string };
      if (!res.ok || !json.ok || !Array.isArray(json.urls)) {
        throw new Error(json.error || `Upload failed (HTTP ${res.status})`);
      }
      const next = [...values, ...json.urls].slice(0, max);
      onChange(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }, [remaining, values, max, onChange]);

  return (
    <div>
      {label ? (
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</label>
      ) : null}
      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {values.map((url, i) => (
          <div key={`${url}-${i}`} className="relative aspect-square overflow-hidden rounded-md border border-slate-200 bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Site ${i + 1}`} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(values.filter((_, j) => j !== i))}
              disabled={disabled}
              className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/80 text-white shadow-sm hover:bg-rose-600"
              title="Remove photo"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {Array.from({ length: remaining }).map((_, i) => (
          <button
            key={`slot-${i}`}
            type="button"
            disabled={disabled || busy}
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-slate-500 hover:border-slate-400 hover:bg-slate-100 disabled:opacity-50"
            title="Add photo"
          >
            {busy && i === 0 ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Upload className="h-5 w-5" />
            )}
          </button>
        ))}
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="text-[10px] text-slate-500">
          {hint ?? `JPG / PNG / WebP · up to ${max} images · max 8MB each`}
        </p>
        <p className="text-[10px] font-semibold text-slate-600">
          {values.length} / {max}
        </p>
      </div>
      {error ? <p className="mt-1 text-[11px] font-semibold text-rose-700">{error}</p> : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length > 0) void upload(files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
