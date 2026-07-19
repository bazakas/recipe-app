"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type MenuItem = { label: string; onClick: () => void; danger?: boolean };

const MENU_WIDTH = 192; // w-48

/**
 * A three-dots (kebab) menu button with a dropdown. The dropdown is rendered in
 * a portal and positioned under the button so it's never clipped by a card's
 * overflow-hidden / hover transform. Touch-friendly (always visible, no hover).
 */
export function CardMenu({
  items,
  label = "Options",
  variant = "overlay",
}: {
  items: MenuItem[];
  label?: string;
  variant?: "overlay" | "plain";
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      setPos({
        top: r.bottom + 6,
        left: Math.max(8, r.right - MENU_WIDTH),
      });
    }
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const btnClass =
    variant === "overlay"
      ? "grid h-8 w-8 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition-colors hover:bg-black/70"
      : "grid h-8 w-8 place-items-center rounded-lg border border-line bg-surface text-muted hover:text-ink";

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={btnClass}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="12" cy="19" r="1.7" />
        </svg>
      </button>

      {open &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[60]"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
              }}
            />
            <div
              role="menu"
              style={{ top: pos.top, left: pos.left, width: MENU_WIDTH }}
              className="fixed z-[61] rounded-xl border border-line bg-surface p-1.5 shadow-[var(--shadow)]"
              onClick={(e) => e.stopPropagation()}
            >
              {items.map((it, i) => (
                <button
                  key={i}
                  type="button"
                  role="menuitem"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpen(false);
                    it.onClick();
                  }}
                  className={`block w-full rounded-lg px-2.5 py-2 text-left text-sm hover:bg-surface-2 ${
                    it.danger ? "text-hot" : ""
                  }`}
                >
                  {it.label}
                </button>
              ))}
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
