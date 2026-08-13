// Epicenter Index — live-globe.js
// Renders the live USGS feed (already fetched by live-feed.js) as a second globe view sharing the same #globe-chart canvas as the calculated globe. Also owns the Calculated/Live mode toggle, since it needs to coordinate which globe is mounted, which toolbar is visible, and whether the header "Live feed active" pill is shown.

(function () {
  "use strict";
  if (typeof Plotly === "undefined") return;

  var el = document.getElementById("globe-chart");
  var statusEl = document.getElementById("live-globe-status");
  var frameEl = el ? el.closest(".globe-frame") : null;
  if (!el) return;

  var ALERT_COLOR = window.EPICENTER_ALERT_COLOR || {
    green: "#16A34A", yellow: "#F5A524", orange: "#F5A524", red: "#EF4444"
  };
  var NONE_COLOR = "#5B5F6B";

  // Bucket definition: yellow and orange share one visual bucket because they already share one colour (see live-feed.js). Keeping them separate in the filter chips but merged in colour would let two "different" filters look identical on the globe, which is more confusing than useful.
  var BUCKETS = [
    { key: "green", label: "Green", color: ALERT_COLOR.green, match: function (a) { return a === "green"; } },
    { key: "yellow", label: "Yellow / Orange", color: ALERT_COLOR.yellow, match: function (a) { return a === "yellow" || a === "orange"; } },
    { key: "red", label: "Red", color: ALERT_COLOR.red, match: function (a) { return a === "red"; } },
    { key: "none", label: "No alert level", color: NONE_COLOR, match: function (a) { return !a; } }
  ];

  var activeAlerts = { green: true, yellow: true, red: true, none: true };
  var minMagFilter = 0;
  var liveFeatures = [];
  var liveMounted = false;

  function normalize(features) {
    return features.map(function (f) {
      var p = f.properties;
      var coords = f.geometry && f.geometry.coordinates ? f.geometry.coordinates : [null, null, null];
      return {
        lon: coords[0], lat: coords[1], depth: coords[2],
        mag: typeof p.mag === "number" ? p.mag : null,
        alert: p.alert || null,
        place: p.place || "Unknown location",
        time: p.time,
        tsunami: p.tsunami === 1,
        url: p.url
      };
    }).filter(function (pt) { return pt.lat !== null && pt.lon !== null && pt.mag !== null; });
  }

  function markerSize(mag) {
    var size = 5 + (mag - 4) * 3.2;
    return Math.max(6, Math.min(size, 26));
  }

  function populateMagSelect() {
    var select = document.getElementById("live-mag-select");
    if (!select || !liveFeatures.length) return;
    var mags = liveFeatures.map(function (p) { return p.mag; });
    var min = Math.floor(Math.min.apply(null, mags));
    var max = Math.floor(Math.max.apply(null, mags));
    var html = '<option value="' + min + '">All (M' + min.toFixed(1) + '+)</option>';
    for (var m = min + 1; m <= max; m++) {
      html += '<option value="' + m + '">M' + m + '+</option>';
    }
    select.innerHTML = html;
    select.value = String(min);
    minMagFilter = min;
  }

  function filteredFeatures() {
    return liveFeatures.filter(function (p) {
      if (p.mag < minMagFilter) return false;
      var bucket = BUCKETS.filter(function (b) { return b.match(p.alert); })[0];
      var key = bucket ? bucket.key : "none";
      return activeAlerts[key];
    });
  }

  function buildLiveTraces() {
    var pts = filteredFeatures();
    return BUCKETS.map(function (b) {
      var subset = pts.filter(function (p) { return b.match(p.alert); });
      return {
        type: "scattergeo",
        mode: "markers",
        name: b.label,
        legend: "legend",
        lat: subset.map(function (p) { return p.lat; }),
        lon: subset.map(function (p) { return p.lon; }),
        text: subset.map(function (p) {
          var mag = p.mag.toFixed(1);
          var when = window.EPICENTER_relativeTime ? window.EPICENTER_relativeTime(p.time) : "";
          return p.place + "<br>Magnitude " + mag +
            "<br>Depth " + (p.depth !== null ? Math.round(p.depth) + " km" : "unknown") +
            (when ? "<br>" + when : "") +
            (p.tsunami ? "<br>Tsunami flag set" : "");
        }),
        hoverinfo: "text",
        marker: {
          size: subset.map(function (p) { return markerSize(p.mag); }),
          color: b.color,
          opacity: 0.88,
          line: { width: 0.75, color: "#ffffff" }
        },
        visible: true
      };
    });
  }

  var legendStyle = {
    font: { size: 13, color: "#14161A", family: "Inter, sans-serif" },
    bgcolor: "rgba(255,255,255,0.96)",
    bordercolor: "#E2E4E9",
    borderwidth: 1.5
  };

  function legendLayoutFor(width) {
    if (width < 640) {
      return {
        legend: Object.assign({}, legendStyle, {
          title: { text: "USGS alert level" },
          orientation: "h", y: -0.04, yanchor: "top", x: 0.5, xanchor: "center"
        }),
        margin: { l: 0, r: 0, t: 10, b: 130 }
      };
    }
    return {
      legend: Object.assign({}, legendStyle, {
        title: { text: "USGS alert level" },
        orientation: "v", y: 1, yanchor: "top", x: 1.02, xanchor: "left"
      }),
      margin: { l: 0, r: 200, t: 10, b: 10 }
    };
  }

  function baseLayout() {
    return {
      geo: {
        projection: { type: "orthographic" },
        showland: true,
        landcolor: "#C9A876",
        showocean: true,
        oceancolor: "#1D4E89",
        showcountries: true,
        countrycolor: "#8A6D3B",
        coastlinecolor: "#0D2C4F",
        showlakes: true,
        lakecolor: "#1D4E89",
        showframe: false,
        bgcolor: "rgba(0,0,0,0)"
      },
      paper_bgcolor: "rgba(0,0,0,0)",
      font: { family: "Inter, sans-serif", size: 12, color: "#5B5F6B" },
      showlegend: true,
      uirevision: "epicenter-live-globe"
    };
  }

  var config = { responsive: true, displaylogo: false, scrollZoom: true };

  function setStatus(message) {
    if (!statusEl) return;
    if (!message) { statusEl.hidden = true; statusEl.textContent = ""; return; }
    statusEl.hidden = false;
    statusEl.textContent = message;
  }

  function render() {
    if (!liveFeatures.length) return;
    var layout = Object.assign({}, baseLayout(), legendLayoutFor(window.innerWidth));
    Plotly.react(el, buildLiveTraces(), layout, config);
  }

  function mountLive() {
    liveMounted = true;
    if (frameEl) frameEl.classList.add("mode-live");
    var live = window.EPICENTER_LIVE || { status: "loading", features: [] };
    if (live.status === "ready") {
      liveFeatures = normalize(live.features);
      if (!liveFeatures.length) {
        setStatus("No magnitude 6.0+ earthquakes reported by USGS in the last 12 months.");
        Plotly.purge(el);
        return;
      }
      setStatus(null);
      populateMagSelect();
      render();
    } else if (live.status === "error") {
      setStatus("Live feed unavailable right now. This does not affect the calculated globe or the analysis above.");
    } else {
      setStatus("Loading the last 12 months of magnitude 6.0+ earthquakes from USGS\u2026");
    }
  }

  function unmountLive() {
    liveMounted = false;
    if (frameEl) frameEl.classList.remove("mode-live");
    setStatus(null);
    Plotly.purge(el);
  }

  document.addEventListener("epicenter:live-data", function (evt) {
    if (!liveMounted) return;
    var detail = evt.detail || { status: "error", features: [] };
    if (detail.status === "ready") {
      liveFeatures = normalize(detail.features);
      if (!liveFeatures.length) {
        setStatus("No magnitude 6.0+ earthquakes reported by USGS in the last 12 months.");
        return;
      }
      setStatus(null);
      populateMagSelect();
      render();
    } else {
      setStatus("Live feed unavailable right now. This does not affect the calculated globe or the analysis above.");
    }
  });

  // ---- Live filters ----
  var alertGroup = document.getElementById("live-alert-filter");
  if (alertGroup) {
    var alertButtons = alertGroup.querySelectorAll("[data-alert]");
    alertGroup.addEventListener("click", function (evt) {
      var btn = evt.target.closest("[data-alert]");
      if (!btn) return;
      var key = btn.getAttribute("data-alert");

      if (key === "all") {
        var makeActive = btn.getAttribute("aria-pressed") !== "true";
        activeAlerts = { green: makeActive, yellow: makeActive, red: makeActive, none: makeActive };
        alertButtons.forEach(function (b) { b.setAttribute("aria-pressed", makeActive ? "true" : "false"); });
      } else {
        activeAlerts[key] = btn.getAttribute("aria-pressed") !== "true";
        btn.setAttribute("aria-pressed", activeAlerts[key] ? "true" : "false");
        var allOn = activeAlerts.green && activeAlerts.yellow && activeAlerts.red && activeAlerts.none;
        var allBtn = alertGroup.querySelector('[data-alert="all"]');
        if (allBtn) allBtn.setAttribute("aria-pressed", allOn ? "true" : "false");
      }
      if (liveMounted) render();
    });
  }

  var magSelect = document.getElementById("live-mag-select");
  if (magSelect) {
    magSelect.addEventListener("change", function () {
      minMagFilter = Number(magSelect.value);
      if (liveMounted) render();
    });
  }

  window.addEventListener("resize", function () {
    if (window.EPICENTER_ACTIVE_GLOBE !== "live" || !liveMounted || !liveFeatures.length) return;
    Plotly.relayout(el, legendLayoutFor(window.innerWidth));
  });

  // ---- Mode toggle: Calculated <-> Live ----
  var modeButtons = document.querySelectorAll("[data-globe-mode]");
  var calcToolbar = document.getElementById("calculated-toolbar");
  var liveToolbar = document.getElementById("live-toolbar");
  var descEl = document.getElementById("globe-mode-desc");
  var noteEl = document.getElementById("globe-note-text");
  var tableToggleBtn = document.getElementById("toggle-table");
  var tableWrap = document.getElementById("data-table-wrap");
  var livePill = document.querySelector(".live-pill");

  var COPY = {
    calculated: {
      desc: "Rotate, zoom, and drag freely. Switch between raw events and the concentration grid, and change the grid size to see how the hotspots shift.",
      note: "Colour encodes magnitude class. Marker size scales with magnitude. Hotspot circles scale with event count per cell."
    },
    live: {
      desc: "The same globe, now showing every USGS-recorded earthquake of magnitude 6.0 or above from the last 12 months, queried directly from USGS's event catalog. That's a rolling window, not the fixed, cited 1995\u20132023 dataset above, so the exact count changes over time.",
      note: "Colour encodes the official USGS PAGER alert level, only assigned to large or high-impact events; most events here still show as \"No alert level.\" Marker size scales with magnitude. This layer is not part of the cited 1995\u20132023 dataset."
    }
  };

  if (livePill) livePill.style.display = "none";

  modeButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var mode = btn.getAttribute("data-globe-mode");
      if (window.EPICENTER_ACTIVE_GLOBE === mode) return;

      modeButtons.forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
      btn.setAttribute("aria-pressed", "true");

      if (mode === "live") {
        if (window.EPICENTER_CALC_GLOBE) window.EPICENTER_CALC_GLOBE.unmount();
        window.EPICENTER_ACTIVE_GLOBE = "live";
        if (calcToolbar) calcToolbar.hidden = true;
        if (liveToolbar) liveToolbar.hidden = false;
        if (tableToggleBtn) tableToggleBtn.hidden = true;
        if (tableWrap) tableWrap.classList.remove("is-open");
        if (livePill) livePill.style.display = "";
        mountLive();
      } else {
        unmountLive();
        window.EPICENTER_ACTIVE_GLOBE = "calculated";
        if (liveToolbar) liveToolbar.hidden = true;
        if (calcToolbar) calcToolbar.hidden = false;
        if (tableToggleBtn) tableToggleBtn.hidden = false;
        if (livePill) livePill.style.display = "none";
        if (window.EPICENTER_CALC_GLOBE) window.EPICENTER_CALC_GLOBE.mount();
      }

      if (descEl) descEl.textContent = COPY[mode].desc;
      if (noteEl) noteEl.textContent = COPY[mode].note;
    });
  });
})();
