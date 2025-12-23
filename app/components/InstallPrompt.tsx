"use client";

import { useEffect, useState } from "react";

type InstallEvent = Event & { prompt: () => Promise<void> };

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const count = Number(localStorage.getItem("gg-visits") ?? "0") + 1;
    localStorage.setItem("gg-visits", String(count));
    if (count >= 3) setReady(true);

    const handler = (event: Event) => {
      event.preventDefault();
      setDeferred(event as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!ready || !deferred) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-40 w-[90%] max-w-sm -translate-x-1/2 rounded-2xl bg-base-200/80 p-4 text-white backdrop-blur">
      <p className="text-sm">Install FlashGame for quick access.</p>
      <button
        onClick={() => deferred.prompt()}
        className="btn btn-sm mt-3 rounded-full bg-emerald-400 text-black"
        aria-label="Install app"
      >
        Install
      </button>
    </div>
  );
}
