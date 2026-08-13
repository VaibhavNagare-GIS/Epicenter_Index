// Epicenter Index — globe.js
// Builds the interactive orthographic globe using Plotly.js (loaded via CDN in index.html).
// Traces: five magnitude-class event traces, one grid-cell hotspot trace, and three
// invisible "scale key" traces that exist only to give the hotspot legend real numbers.
// A toggle group controls which layer is visible, a select controls which pre-computed
// grid size (5/10/20 degrees) the hotspot trace uses.

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

  function hotspotDiameter(count, maxCount) {
    return 8 + 26 * Math.sqrt(count / maxCount);
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
        legend: "legend",
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
          opacity: 0.95,
          line: { width: 0.75, color: "#ffffff" }
        },
        legendgroup: "events",
        visible: true
      };
    });
  }

  function buildHotspotTrace(gridSize, visible) {
    var cells = DATA.grids[String(gridSize)].cells;
    var maxCount = Math.max.apply(null, cells.map(function (c) { return c.count; }));
    return {
      type: "scattergeo",
      mode: "markers",
      name: gridSize + "\u00b0 grid cells",
      legend: "legend2",
      lat: cells.map(function (c) { return c.lat; }),
      lon: cells.map(function (c) { return c.lon; }),
      text: cells.map(function (c) {
        return "Cell centre " + c.lat.toFixed(1) + ", " + c.lon.toFixed(1) +
          "<br>" + c.count + " events (" + c.share_pct + "% of total)" +
          "<br>Mean magnitude " + c.mean_mag;
      }),
      hoverinfo: "text",
      marker: {
        size: cells.map(function (c) { return hotspotDiameter(c.count, maxCount); }),
        sizemode: "diameter",
        color: "#FFD400",
        opacity: 0.5,
        line: { width: 1.75, color: "#B8860B" }
      },
      legendgroup: "hotspots",
      visible: !!visible
    };
  }

  // Three invisible-on-map points whose only job is to put real numbers on the
  // hotspot circle sizes in the legend (fewest / typical / busiest cell), computed
  // fresh from the actual grid data, not estimated.
  function buildScaleTraces(gridSize, visible) {
    var cells = DATA.grids[String(gridSize)].cells;
    var counts = cells.map(function (c) { return c.count; }).sort(function (a, b) { return a - b; });
    var maxCount = counts[counts.length - 1];
    var minCount = counts[0];
    var medCount = counts[Math.floor(counts.length / 2)];
    var points = [
      { count: maxCount, label: maxCount + " events (busiest cell)" },
      { count: medCount, label: medCount + " events (typical cell)" },
      { count: minCount, label: minCount + " events (fewest)" }
    ];
    return points.map(function (p) {
      return {
        type: "scattergeo",
        mode: "markers",
        lat: [null],
        lon: [null],
        name: p.label,
        legend: "legend2",
        legendgroup: "hotspot-scale",
        hoverinfo: "skip",
        marker: {
          size: hotspotDiameter(p.count, maxCount),
          sizemode: "diameter",
          color: "#FFD400",
          opacity: 0.5,
          line: { width: 1.75, color: "#B8860B" }
        },
        visible: !!visible
      };
    });
  }

  var eventTraces = buildEventTraces();
  var currentGrid = 10;
  var hotspotVisible = false;
  var currentLayer = "events";
  var hotspotTrace = buildHotspotTrace(currentGrid, hotspotVisible);
  var scaleTraces = buildScaleTraces(currentGrid, hotspotVisible);

  function allTraces() {
    return eventTraces.concat([hotspotTrace]).concat(scaleTraces);
  }

  // Satellite-style basemap: deep ocean blue, warm tan/brown land, so both the
  // event markers and the hotspot circles read clearly against it.
  var baseLayout = {
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
    // Keeps the user's rotate/zoom position when we rebuild traces on grid change.
    uirevision: "epicenter-globe"
  };

  var legendStyle = {
    font: { size: 13, color: "#14161A", family: "Inter, sans-serif" },
    bgcolor: "rgba(255,255,255,0.96)",
    bordercolor: "#E2E4E9",
    borderwidth: 1.5
  };

  // The hotspot legend (legend2) moves depending on what's actually showing:
  // - "events" layer: legend2 has no visible entries, position is irrelevant.
  // - "hotspots" only: legend2 takes the SAME top-right slot the events legend
  //   normally occupies (there's nothing else there to share it with).
  // - "both": legend2 drops below the events legend so the two don't overlap.
  function legend2Position(layer, width) {
    var stacked = (layer === "both");
    if (width < 640) return stacked ? -0.34 : -0.04;
    return stacked ? 0.46 : 1;
  }

  // Two stacked legend boxes on wide screens (magnitude classes on top, hotspot
  // scale below it when both are visible), collapsing to two horizontal rows
  // under the globe on phones.
  function legendLayoutFor(width, layer) {
    var legend2Y = legend2Position(layer, width);
    if (width < 640) {
      return {
        legend: Object.assign({}, legendStyle, {
          title: { text: "Magnitude class" },
          orientation: "h", y: -0.04, yanchor: "top", x: 0.5, xanchor: "center"
        }),
        legend2: Object.assign({}, legendStyle, {
          title: { text: "Hotspot scale (events / cell)" },
          orientation: "h", y: legend2Y, yanchor: "top", x: 0.5, xanchor: "center"
        }),
        margin: { l: 0, r: 0, t: 10, b: 190 }
      };
    }
    return {
      legend: Object.assign({}, legendStyle, {
        title: { text: "Magnitude class" },
        orientation: "v", y: 1, yanchor: "top", x: 1.02, xanchor: "left"
      }),
      legend2: Object.assign({}, legendStyle, {
        title: { text: "Hotspot scale (events / cell)" },
        orientation: "v", y: legend2Y, yanchor: "top", x: 1.02, xanchor: "left"
      }),
      margin: { l: 0, r: 200, t: 10, b: 10 }
    };
  }

  var config = { responsive: true, displaylogo: false, scrollZoom: true };

  var el = document.getElementById("globe-chart");

  function mount() {
    if (!el) return;
    var layout = Object.assign({}, baseLayout, legendLayoutFor(window.innerWidth, currentLayer));
    Plotly.newPlot(el, allTraces(), layout, config);
  }

  function unmount() {
    if (!el) return;
    Plotly.purge(el);
  }

  if (el) {
    mount();

    var resizeTimer = null;
    window.addEventListener("resize", function () {
      // Only this globe's resize handler should touch the shared chart div;
      // the live globe has its own handler guarded the same way.
      if (window.EPICENTER_ACTIVE_GLOBE !== "calculated") return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        Plotly.relayout(el, legendLayoutFor(window.innerWidth, currentLayer));
      }, 200);
    });
  }

  window.EPICENTER_CALC_GLOBE = { mount: mount, unmount: unmount };
  window.EPICENTER_ACTIVE_GLOBE = "calculated";

  // ---- Layer toggle ----
  function setLayer(layer) {
    currentLayer = layer;
    var eventsVisible = layer === "events" || layer === "both";
    hotspotVisible = (layer === "hotspots" || layer === "both");
    var update = { visible: [] };
    for (var i = 0; i < eventTraces.length; i++) update.visible.push(eventsVisible);
    update.visible.push(hotspotVisible); // hotspot trace
    for (var j = 0; j < scaleTraces.length; j++) update.visible.push(hotspotVisible);
    Plotly.restyle(el, update);
    Plotly.relayout(el, { "legend2.y": legend2Position(layer, window.innerWidth) });
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

      var activeLayer = document.querySelector("[data-layer][aria-pressed='true']");
      var layerName = activeLayer ? activeLayer.getAttribute("data-layer") : "events";

      // Root cause of "changing grid size does nothing": the hotspot trace is
      // hidden whenever the layer is "Events", so a new grid size had nothing
      // to show. Switch to "Both" so the new grid is always visible.
      if (layerName === "events") {
        layerName = "both";
        toggleButtons.forEach(function (b) {
          b.setAttribute("aria-pressed", b.getAttribute("data-layer") === "both" ? "true" : "false");
        });
      }
      currentLayer = layerName;

      hotspotVisible = (layerName === "hotspots" || layerName === "both");
      hotspotTrace = buildHotspotTrace(currentGrid, hotspotVisible);
      scaleTraces = buildScaleTraces(currentGrid, hotspotVisible);

      var eventsVisible = (layerName === "events" || layerName === "both");
      eventTraces.forEach(function (t) { t.visible = eventsVisible; });

      var layout = Object.assign({}, el.layout, legendLayoutFor(window.innerWidth, currentLayer));
      Plotly.react(el, allTraces(), layout, config);
    });
  }
})();
