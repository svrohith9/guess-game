"use client";

import { useEffect } from "react";
import { Workbox } from "workbox-window";

export default function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => reg.unregister());
      });
      return;
    }
    const wb = new Workbox("/sw.js");
    wb.register();
  }, []);

  return null;
}
