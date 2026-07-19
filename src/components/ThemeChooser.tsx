"use client";

import { useEffect, useState } from "react";

type Mode = "light" | "dark" | "system";

function readMode(): Mode {
  const m = document.cookie.match(/(?:^|;\s*)theme=(light|dark)/);
  return (m?.[1] as Mode) ?? "system";
}

const OPTIONS: { value: Mode; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

export function ThemeChooser() {
  const [mode, setMode] = useState<Mode | null>(null);

  useEffect(() => setMode(readMode()), []);

  function choose(next: Mode) {
    setMode(next);
    const root = document.documentElement;
    if (next === "system") {
      document.cookie = "theme=; path=/; max-age=0; SameSite=Lax";
      root.removeAttribute("data-theme"); // fall back to prefers-color-scheme
    } else {
      document.cookie = `theme=${next}; path=/; max-age=31536000; SameSite=Lax`;
      root.setAttribute("data-theme", next);
    }
  }

  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-line">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => choose(o.value)}
          aria-pressed={mode === o.value}
          className={`border-r border-line px-4 py-1.5 text-sm font-medium last:border-r-0 ${
            mode === o.value ? "bg-accent text-accent-fg" : "bg-surface hover:bg-surface-2"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
