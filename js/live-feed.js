// Epicenter Index — live-feed.js
// Pulls the real, current significant-earthquakes feed directly from USGS.
// Public endpoint, no key required, CORS-enabled for direct browser use.
// This is deliberately kept separate from EPICENTER_DATA: it never touches
// the cited 1995-2023 dataset or any of the statistics/charts on this page.
//
// This module's only job now is fetching and sharing the data: it exposes
// window.EPICENTER_LIVE (status + features), window.EPICENTER_ALERT_COLOR,
// and window.EPICENTER_relativeTime, and fires an "epicenter:live-data" event
// on document when the fetch settles. live-globe.js consumes all of this to
// draw the Live Monitor globe. There is no standalone live-feed list UI
// anymore, that panel was removed in favour of the Live Monitor globe view.

(function () {
  "use strict";

  var FEED_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson";
  var TIMEOUT_MS = 8000;

  // Standard USGS alert colour hierarchy. Yellow and orange intentionally
  // share a swatch (see Data & citation section) to keep the palette from
  // splitting into two near-identical ambers that aren't reliably distinguishable.
  var ALERT_COLOR = {
    green: "#16A34A",
    yellow: "#F5A524",
    orange: "#F5A524",
    red: "#EF4444"
  };
  window.EPICENTER_ALERT_COLOR = ALERT_COLOR;
  window.EPICENTER_LIVE = { status: "loading", features: [] };

  function relativeTime(epochMs) {
    var diffMin = Math.round((Date.now() - epochMs) / 60000);
    if (diffMin < 60) return diffMin + " min ago";
    var diffHr = Math.round(diffMin / 60);
    if (diffHr < 24) return diffHr + " hr ago";
    var diffDay = Math.round(diffHr / 24);
    return diffDay + " day" + (diffDay === 1 ? "" : "s") + " ago";
  }
  window.EPICENTER_relativeTime = relativeTime;

  function broadcast(status, features) {
    window.EPICENTER_LIVE = { status: status, features: features || [] };
    document.dispatchEvent(new CustomEvent("epicenter:live-data", { detail: window.EPICENTER_LIVE }));
  }

  function load() {
    if (!("fetch" in window)) {
      broadcast("error", []);
      return;
    }

    var controller = ("AbortController" in window) ? new AbortController() : null;
    var timeoutId = controller ? setTimeout(function () { controller.abort(); }, TIMEOUT_MS) : null;

    fetch(FEED_URL, controller ? { signal: controller.signal } : {})
      .then(function (res) {
        if (timeoutId) clearTimeout(timeoutId);
        if (!res.ok) throw new Error("USGS feed returned status " + res.status);
        return res.json();
      })
      .then(function (geojson) {
        broadcast("ready", geojson.features || []);
      })
      .catch(function (err) {
        console.warn("Live feed unavailable:", err);
        broadcast("error", []);
      });
  }

  document.addEventListener("DOMContentLoaded", load);
})();
