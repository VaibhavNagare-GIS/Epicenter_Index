// Epicenter Index — live-feed.js
// Pulls real earthquake data directly from the USGS FDSN event query API (https://earthquake.usgs.gov/fdsnws/event/1/query), public endpoint, no key required, CORS-enabled for direct browser use. This is deliberately kept separate from EPICENTER_DATA: it never touches the cited 1995-2023 dataset or any of the statistics/charts on this page.

// Query window: past 12 months, magnitude 6.0 and above. USGS's pre-built "significant" feeds only go back 30 days at most, which on a quiet month can return very few events. Querying the FDSN API directly for a full year at magnitude 6.0+ gives a meaningfully larger, still-notable sample, and stays close to this site's own 6.5+ threshold for the historical dataset.
// PAGER alert levels (green/yellow/orange/red) are only assigned by USGS to events large enough to trigger a loss estimate, roughly M5.5+, so at this magnitude floor most returned events still carry a real alert value.
// This module's only job is fetching and sharing the data: it exposes window.EPICENTER_LIVE (status + features), window.EPICENTER_ALERT_COLOR, and window.EPICENTER_relativeTime, and fires an "epicenter:live-data" event on document when the fetch settles. live-globe.js consumes all of this to draw the Live Monitor globe.

(function () {
  "use strict";

  var LIVE_WINDOW_DAYS = 365;
  var LIVE_MIN_MAGNITUDE = 6.0;
  var TIMEOUT_MS = 10000;

  function feedUrl() {
    var end = new Date();
    var start = new Date(end.getTime() - LIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    var params = [
      "format=geojson",
      "starttime=" + start.toISOString(),
      "endtime=" + end.toISOString(),
      "minmagnitude=" + LIVE_MIN_MAGNITUDE,
      "orderby=time",
      "limit=500"
    ];
    return "https://earthquake.usgs.gov/fdsnws/event/1/query?" + params.join("&");
  }
  window.EPICENTER_LIVE_WINDOW_DAYS = LIVE_WINDOW_DAYS;
  window.EPICENTER_LIVE_MIN_MAGNITUDE = LIVE_MIN_MAGNITUDE;

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
    if (diffDay < 30) return diffDay + " day" + (diffDay === 1 ? "" : "s") + " ago";
    var diffMonth = Math.round(diffDay / 30);
    return diffMonth + " month" + (diffMonth === 1 ? "" : "s") + " ago";
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

    fetch(feedUrl(), controller ? { signal: controller.signal } : {})
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
