// Epicenter Index — charts.js
// Two supporting charts: magnitude class distribution (bar) and events per year (line).
// Rendering is deliberately NOT triggered on DOMContentLoaded. The Charts tab is hidden at page load (display:none), and Plotly given a zero-width/zero-height container at draw time produces a broken, clipped, non-responsive chart that a later resize event does not reliably fix across Plotly versions. Instead, main.js's tab switcher calls window.EPICENTER_CHARTS.renderAll() the first time the Charts tab is actually shown, when the container has real dimensions.

(function () {
  "use strict";
  if (typeof EPICENTER_DATA === "undefined" || typeof Plotly === "undefined") return;

  var DATA = EPICENTER_DATA;
  var CLASS_COLOR = {
    "6.5-6.9": "#2F5EFF",
    "7.0-7.4": "#16A34A",
    "7.5-7.9": "#F5A524",
    "8.0-8.9": "#EF4444",
    "9.0+":    "#7C5CFC"
  };
  var CLASS_ORDER = ["6.5-6.9", "7.0-7.4", "7.5-7.9", "8.0-8.9", "9.0+"];

  var baseFont = { family: "Inter, sans-serif", size: 13, color: "#5B5F6B" };
  var baseConfig = { responsive: true, displaylogo: false, displayModeBar: false };

  // ---- Magnitude distribution bar chart ----
  function renderMagnitudeChart() {
    var el = document.getElementById("magnitude-chart");
    if (!el) return;
    var values = CLASS_ORDER.map(function (c) { return DATA.magnitude_distribution[c] || 0; });
    var trace = {
      type: "bar",
      x: CLASS_ORDER,
      y: values,
      marker: { color: CLASS_ORDER.map(function (c) { return CLASS_COLOR[c]; }), line: { width: 0 } },
      text: values.map(String),
      textposition: "outside",
      cliponaxis: false,
      hovertemplate: "%{x}: %{y} events<extra></extra>"
    };
    var layout = {
      autosize: true,
      margin: { l: 50, r: 20, t: 40, b: 55 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: baseFont,
      xaxis: { title: "Magnitude class", showgrid: false, automargin: true },
      yaxis: { title: "Events", showgrid: true, gridcolor: "#E2E4E9", automargin: true, range: [0, 680] }
    };
    Plotly.newPlot(el, [trace], layout, baseConfig);
  }

  // ---- Annual trend line chart ----
  function renderTimeChart() {
    var el = document.getElementById("time-chart");
    if (!el) return;
    var years = Object.keys(DATA.annual_trend).map(Number).sort(function (a, b) { return a - b; });
    var counts = years.map(function (y) { return DATA.annual_trend[y]; });
    var trace = {
      type: "scatter",
      mode: "lines+markers",
      x: years,
      y: counts,
      line: { color: "#2F5EFF", width: 2, shape: "spline" },
      marker: { color: "#2F5EFF", size: 5 },
      fill: "tozeroy",
      fillcolor: "rgba(47,94,255,0.08)",
      hovertemplate: "%{x}: %{y} events<extra></extra>"
    };
    var layout = {
      autosize: true,
      margin: { l: 50, r: 20, t: 20, b: 50 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: baseFont,
      xaxis: { title: "Year", showgrid: false, dtick: 5, automargin: true },
      yaxis: { title: "Events", showgrid: true, gridcolor: "#E2E4E9", automargin: true }
    };
    Plotly.newPlot(el, [trace], layout, baseConfig);
  }

  var rendered = false;
  function renderAll() {
    renderMagnitudeChart();
    renderTimeChart();
    rendered = true;
  }

  function resize() {
    if (!rendered) return;
    var magEl = document.getElementById("magnitude-chart");
    var timeEl = document.getElementById("time-chart");
    if (magEl) Plotly.Plots.resize(magEl);
    if (timeEl) Plotly.Plots.resize(timeEl);
  }

  window.EPICENTER_CHARTS = { renderAll: renderAll, resize: resize };
})();
