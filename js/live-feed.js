// Epicenter Index — live-feed.js
// Pulls the real, current significant-earthquakes feed directly from USGS.
// Public endpoint, no key required, CORS-enabled for direct browser use.
// This is deliberately kept separate from EPICENTER_DATA: it never touches
// the cited 1995-2023 dataset or any of the statistics/charts on this page.

(function () {
  "use strict";

  var FEED_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson";
  var MAX_ITEMS = 8;
  var TIMEOUT_MS = 8000;

  var ALERT_COLOR = {
    green: "#16A34A",
    yellow: "#F5A524",
    orange: "#F5A524",
    red: "#EF4444"
  };

  function relativeTime(epochMs) {
    var diffMin = Math.round((Date.now() - epochMs) / 60000);
    if (diffMin < 60) return diffMin + " min ago";
    var diffHr = Math.round(diffMin / 60);
    if (diffHr < 24) return diffHr + " hr ago";
    var diffDay = Math.round(diffHr / 24);
    return diffDay + " day" + (diffDay === 1 ? "" : "s") + " ago";
  }

  function render(features) {
    var list = document.getElementById("live-list");
    if (!list) return;

    if (!features.length) {
      list.innerHTML = '<li class="live-state">No significant earthquakes reported by USGS in the last 30 days.</li>';
      return;
    }

    var sorted = features.slice().sort(function (a, b) {
      return b.properties.time - a.properties.time;
    }).slice(0, MAX_ITEMS);

    list.innerHTML = sorted.map(function (f) {
      var p = f.properties;
      var mag = typeof p.mag === "number" ? p.mag.toFixed(1) : "\u2014";
      var color = ALERT_COLOR[p.alert] || "#5B5F6B";
      return (
        '<li>' +
          '<span class="live-mag" style="background:' + color + '22;color:' + color + '">M ' + mag + '</span>' +
          '<a href="' + p.url + '" target="_blank" rel="noopener">' + escapeHtml(p.place || "Unknown location") + '</a>' +
          '<span class="live-time">' + relativeTime(p.time) + '</span>' +
        '</li>'
      );
    }).join("");
  }

  function renderError(message) {
    var list = document.getElementById("live-list");
    if (!list) return;
    list.innerHTML = '<li class="live-state">' + message + '</li>';
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function load() {
    if (!("fetch" in window)) {
      renderError("Live feed needs a modern browser. The rest of the page works normally.");
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
        render(geojson.features || []);
      })
      .catch(function (err) {
        console.warn("Live feed unavailable:", err);
        renderError("Live feed unavailable right now. This does not affect the analysis above, which uses a fixed, cited dataset.");
      });
  }

  document.addEventListener("DOMContentLoaded", load);
})();
