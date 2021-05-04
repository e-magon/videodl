const videoDLCache = "videoDLCache-v1";
const assets = [
  "/",
  "/index.html",
  "/style.css",
  "/script.js"
];

self.addEventListener("install", installEvent => {
  installEvent.waitUntil(
    caches.open(videoDLCache).then(cache => {
      cache.addAll(assets);
    })
  );
});

// try cache, then network
/*
self.addEventListener("fetch", fetchEvent => {
  fetchEvent.respondWith(
    caches.match(fetchEvent.request).then(res => {
      return res || fetch(fetchEvent.request);
    })
  );
});
*/

// try network, then cache
self.addEventListener('fetch', fetchEvent => {
  if (fetchEvent.request.url.match(/https:\/\/.+\/api\/.*/g))
    return; // won't manage the api calls (when downloading a large file, the sw will stop and fail the download)
  fetchEvent.respondWith(
    fetch(fetchEvent.request).catch(function () {
      console.log("network error when loading" + fetchEvent.request);
      return caches.match(fetchEvent.request);
    })
  );
});