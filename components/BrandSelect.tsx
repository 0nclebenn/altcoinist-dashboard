"use client";

import { useEffect, useRef, useState } from "react";

export interface BrandSelectOption {
  value: string;
  label: string;
  hint?: string;        // optional secondary line, e.g. email
  disabled?: boolean;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: BrandSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
  ariaLabel?: string;
}

/**
 * Drop-in replacement for <select>. Native <select>/<option> elements
 * delegate the dropdown panel to the OS in Chrome/Edge/Safari, which
 * means our brand styling is ignored and the panel renders bright white +
 * blue. This component renders the panel ourselves so it's always
 * brand-themed and readable.
 */
export default function BrandSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  disabled,
  className = "",
  size = "md",
  ariaLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const current = options.find((o) => o.value === value);
  const heightCls = size === "sm" ? "h-8 px-3" : "h-10 px-3";
  const textCls = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`w-full inline-flex items-center justify-between gap-2 ${heightCls} ${textCls} rounded-lg border bg-white/[0.02] text-white/90 transition-all ${
          open
            ? "border-brand-400/40"
            : "border-white/[0.08] hover:border-brand-400/30"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <span className={`truncate font-heading text-left flex-1 ${current ? "text-white/90" : "text-white/40"}`}>
          {current?.label ?? placeholder}
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          aria-hidden="true"
          className={`flex-shrink-0 text-white/55 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M2 4 L5 7 L8 4" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1.5 z-50 panel border border-white/[0.08] rounded-lg shadow-xl py-1 max-h-72 overflow-y-auto"
        >
          {options.length === 0 && (
            <p className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-white/30">
              No options
            </p>
          )}
          {options.map((opt) => {
            const selected = opt.value === value;
            const isDisabled = opt.disabled;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={selected}
                disabled={isDisabled}
                onClick={() => {
                  if (isDisabled) return;
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left transition-colors ${
                  selected
                    ? "bg-brand-400/[0.12] text-brand-400"
                    : "text-white/80 hover:bg-white/[0.04] hover:text-white"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <div className="min-w-0 flex-1">
                  <p className={`${textCls} truncate font-heading`}>{opt.label}</p>
                  {opt.hint && (
                    <p className="font-mono text-[10px] text-white/35 truncate mt-0.5">{opt.hint}</p>
                  )}
                </div>
                {selected && (
                  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" className="flex-shrink-0 text-brand-400">
                    <path d="M2 5 L4 7 L8 3" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
