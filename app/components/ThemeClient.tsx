"use client";

import { useEffect } from "react";

const THEME_KEY = "gg-theme";
const PALETTE_KEY = "gg-palette";

export default function ThemeClient() {
  useEffect(() => {
    const root = document.documentElement;
    const saved = localStorage.getItem(THEME_KEY);
    const palette = localStorage.getItem(PALETTE_KEY);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = saved ?? (prefersDark ? "dark" : "light");
    root.setAttribute("data-theme", theme === "light" ? "light" : "dark");
    if (palette === "colorblind") {
      root.style.setProperty("--fallback-b1", "#0a0f1f");
      root.style.setProperty("--fallback-bc", "#e2f2ff");
    }
  }, []);

  return null;
}
