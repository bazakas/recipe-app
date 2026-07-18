"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

// Theme is stored in a cookie so the server can render it (see layout.tsx).
function readCookieTheme(): Theme | null {
  const m = document.cookie.match(/(?:^|;\s*)theme=(light|dark)/);
  return (m?.[1] as Theme) ?? null;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    // Prefer the server-rendered value, then the cookie, then the OS setting.
    const attr = document.documentElement.getAttribute("data-theme");
    if (attr === "light" || attr === "dark") {
      setTheme(attr);
      return;
    }
    setTheme(
      readCookieTheme() ??
        (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
    );
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    // Persist for one year so the server renders the right theme next time.
    document.cookie = `theme=${next}; path=/; max-age=31536000; SameSite=Lax`;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle light and dark theme"
      title="Toggle theme"
      className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-surface text-muted hover:text-ink"
    >
      {theme === "dark" ? (
        // sun
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        // moon
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}
