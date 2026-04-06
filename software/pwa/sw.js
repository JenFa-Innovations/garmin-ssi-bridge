const CACHE  = "dive-transfer-v1";
const ASSETS = ["/", "/index.html", "/app.js", "/fit-parser.js", "/ssi-builder.js", "/usb-serial.js", "/manifest.json"];

// Install: cache all static assets
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

// Activate: remove old caches
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

// Fetch: cache-first strategy
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);

  // Share target: receive FIT file from Garmin share intent
  if (url.pathname === "/share" && e.request.method === "POST") {
    e.respondWith((async () => {
      const data = await e.request.formData();
      const file = data.get("file");
      if (file) {
        const buf = await file.arrayBuffer();
        await saveSharedFile(buf, file.name);
      }
      return Response.redirect("/?shared=1", 303);
    })());
    return;
  }

  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

// Save shared file to IndexedDB so the app can retrieve it after redirect
function saveSharedFile(buffer, name) {
  return new Promise((res, rej) => {
    const req = indexedDB.open("DiveTransfer", 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore("files");
    req.onsuccess = e => {
      const db = e.target.result;
      const tx = db.transaction("files", "readwrite");
      tx.objectStore("files").put({ buffer, name, ts: Date.now() }, "pending");
      tx.oncomplete = res;
      tx.onerror   = rej;
    };
  });
}
