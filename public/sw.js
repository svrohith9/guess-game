self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

importScripts("/workbox/workbox-sw.js");

if (self.workbox) {
  self.workbox.core.skipWaiting();
  self.workbox.core.clientsClaim();
  self.workbox.routing.registerRoute(
    ({ request }) => request.method === "GET",
    new self.workbox.strategies.StaleWhileRevalidate({ cacheName: "gg-assets" })
  );
}
