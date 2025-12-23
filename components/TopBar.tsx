"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";

export default function TopBar() {
  const { xp, streak } = useStore();
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const saved = localStorage.getItem("gg-theme");
    setTheme(saved ?? "dark");
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("gg-theme", next);
    setTheme(next);
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-emerald-400/80 text-black grid place-items-center font-semibold">
          GG
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Hello, Alex!</p>
          <p className="text-xs text-emerald-300">{streak}-day streak</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 rounded-full bg-base-200/60 px-3 py-1">
          <span className="h-2 w-24 rounded-full bg-base-300">
            <span className="block h-2 w-1/2 rounded-full bg-emerald-400" />
          </span>
          <span className="text-xs text-white/70">{xp} XP</span>
        </div>
        <button
          onClick={toggleTheme}
          className="btn btn-circle btn-ghost"
          aria-label="Toggle theme"
        >
          Theme
        </button>
        <Link href="/login" className="btn btn-circle btn-ghost" aria-label="Profile">
          User
        </Link>
      </div>
    </div>
  );
}
