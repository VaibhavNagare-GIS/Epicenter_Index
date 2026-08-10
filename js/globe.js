// Epicenter Index — globe.js
// Builds the interactive orthographic globe using Plotly.js (loaded via CDN in index.html).
// Two traces: raw events, and grid-cell hotspots. A toggle group controls which is visible,
// a select controls which pre-computed grid size (5/10/20 degrees) the hotspot trace uses.

(function () {
  "use strict";
  if (typeof EPICENTER_DATA === "undefined" || typeof Plotly === "undefined") return;

  var DATA = EPICENTER_DATA;

  // Magnitude class colour map, matches the site's accent palette.
  var CLASS_COLOR = {
    "6.5-6.9": "#2F5EFF",
    "7.0-7.4": "#16A34A",
    "7.5-7.9": "#F5A524",
    "8.0-8.9": "#EF4444",
    "9.0+":    "#7C5CFC"
  };
  var CLASS_ORDER = ["6.5-6.9", "7.0-7.4", "7.5-7.9", "8.0-8.9", "9.0+"];

  function markerSize(mag) {
    // Small, readable range. Clamp so extreme values never break the layout.
    var size = 3 + (mag - 6.5) * 3.4;
    return Math.max(4, Math.min(size, 16));
  }

  function buildEventTraces() {
    // One trace per magnitude class so the legend is meaningful and colour-accessible
    // (colour + legend label together, not colour alone).
    return CLASS_ORDER.map(function (cls) {
      var subset = DATA.events.filter(function (e) { return e.cls === cls; });
      return {
        type: "scattergeo",
        mode: "markers",
        name: cls,
        lat: subset.map(function (e) { return e.lat; }),
        lon: subset.map(function (e) { return e.lon; }),
        text: subset.map(function (e) {
          return e.place + "<br>Magnitude " + e.mag.toFixed(1) +
            (e.depth !== null ? "<br>Depth " + e.depth + " km" : "") +
            (e.time ? "<br>" + e.time : "");
        }),
        hoverinfo: "text",
        marker: {
          size: subset.map(function (e) { return markerSize(e.mag); }),
          color: CLASS_COLOR[cls],
          opacity: 0.85,
          line: { width: 0.5, color: "#ffffff" }
        },
        legendgroup: "events",
        visible: true
      };
    });
  }

  function buildHotspotTrace(gridSize) {
    var cells = DATA.grids[String(gridSize)].cells;
    var maxCount = Math.max.apply(null, cells.map(function (c) { return c.count; }));
    return {
      type: "scattergeo",
      mode: "markers",
      name: gridSize + "\u00b0 hotspots",
      lat: cells.map(function (c) { return c.lat; }),
      lon: cells.map(function (c) { return c.lon; }),
      text: cells.map(function (c) {
        return "Cell centre " + c.lat.toFixed(1) + ", " + c.lon.toFixed(1) +
          "<br>" + c.count + " events (" + c.share_pct + "% of total)" +
          "<br>Mean magnitude " + c.mean_mag;
      }),
      hoverinfo: "text",
      marker: {
        size: cells.map(function (c) { return 8 + 26 * Math.sqrt(c.count / maxCount); }),
        sizemode: "diameter",
        color: "#7C5CFC",
        opacity: 0.35,
        line: { width: 1.5, color: "#4A32C9" }
      },
      visible: false
    };
  }

  var eventTraces = buildEventTraces();
  var currentGrid = 10;
  var hotspotTrace = buildHotspotTrace(currentGrid);
  var hotspotIndex = eventTraces.length; // hotspot trace sits after all event-class traces

  var layout = {
    geo: {
      projection: { type: "orthographic" },
      showland: true,
      landcolor: "#F6F7F9",
      showocean: true,
      oceancolor: "#FFFFFF",
      showcountries: true,
      countrycolor: "#E2E4E9",
      coastlinecolor: "#D5D8DE",
      showframe: false,
      bgcolor: "rgba(0,0,0,0)"
    },
    paper_bgcolor: "rgba(0,0,0,0)",
    margin: { l: 0, r: 0, t: 0, b: 0 },
    font: { family: "Inter, sans-serif", size: 12, color: "#5B5F6B" },
    legend: {
      orientation: "h",
      y: 0,
      x: 0.5,
      xanchor: "center",
      bgcolor: "rgba(255,255,255,0.85)"
    },
    showlegend: true
  };

  var config = { responsive: true, displaylogo: false, scrollZoom: false };

  var el = document.getElementById("globe-chart");
  if (el) {
    Plotly.newPlot(el, eventTraces.concat([hotspotTrace]), layout, config);
  }

  // ---- Layer toggle ----
  function setLayer(layer) {
    var eventsVisible = layer === "events" || layer === "both";
    var hotspotsVisible = layer === "hotspots" || layer === "both";
    var update = { visible: [] };
    for (var i = 0; i < eventTraces.length; i++) update.visible.push(eventsVisible);
    update.visible.push(hotspotsVisible);
    Plotly.restyle(el, update);
  }

  var toggleButtons = document.querySelectorAll("[data-layer]");
  toggleButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      toggleButtons.forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
      btn.setAttribute("aria-pressed", "true");
      setLayer(btn.getAttribute("data-layer"));
    });
  });

  // ---- Grid size selector ----
  var gridSelect = document.getElementById("grid-size-select");
  if (gridSelect) {
    gridSelect.addEventListener("change", function () {
      currentGrid = Number(gridSelect.value);
      var newTrace = buildHotspotTrace(currentGrid);
      var activeLayer = document.querySelector("[data-layer][aria-pressed='true']");
      var layerName = activeLayer ? activeLayer.getAttribute("data-layer") : "events";
      newTrace.visible = (layerName === "hotspots" || layerName === "both");
      Plotly.deleteTraces(el, hotspotIndex);
      Plotly.addTraces(el, newTrace, hotspotIndex);
    });
  }
})();
