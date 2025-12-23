self.workbox = {
  core: {
    skipWaiting: () => self.skipWaiting(),
    clientsClaim: () => self.clients.claim()
  },
  routing: {
    registerRoute: (match, handler) => {
      self.addEventListener("fetch", (event) => {
        const url = new URL(event.request.url);
        if (match({ url, request: event.request })) {
          event.respondWith(handler.handle({ event }));
        }
      });
    }
  },
  strategies: {
    StaleWhileRevalidate: class {
      constructor({ cacheName }) {
        this.cacheName = cacheName;
      }
      async handle({ event }) {
        const cache = await caches.open(this.cacheName);
        const cached = await cache.match(event.request);
        const fetchPromise = fetch(event.request)
          .then((response) => {
            if (response && response.status === 200) {
              cache.put(event.request, response.clone());
            }
            return response;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      }
    }
  }
};
