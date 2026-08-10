// Epicenter Index — main.js
// Handles: KPI strip, stat collage, accordions, data table fallback, scroll reveal.
// Depends on EPICENTER_DATA from data/earthquakes.js, loaded before this file.

(function () {
  "use strict";

  if (typeof EPICENTER_DATA === "undefined") {
    console.error("EPICENTER_DATA not found. Check that data/earthquakes.js loaded before main.js.");
    return;
  }

  var DATA = EPICENTER_DATA;
  var S = DATA.summary;

  // ---- Hero KPI strip ----
  function renderKpis() {
    var el = document.getElementById("hero-kpis");
    if (!el) return;
    var items = [
      { value: S.total_events.toLocaleString(), label: "Events analysed" },
      { value: S.years_covered, label: "Years covered" },
      { value: S.min_magnitude + "\u2013" + S.max_magnitude, label: "Magnitude range" },
      { value: S.median_depth_km + " km", label: "Median depth" },
      { value: S.tsunami_events, label: "Tsunami-flagged" }
    ];
    el.innerHTML = items.map(function (i) {
      return '<div class="kpi-cell"><div class="kpi-value mono">' + i.value +
        '</div><div class="kpi-label">' + i.label + '</div></div>';
    }).join("");
  }

  // ---- Statistics section collage ----
  function renderStatCollage() {
    var el = document.getElementById("stat-collage");
    if (!el) return;
    var g10 = DATA.grids["10"];
    var cards = [
      { cls: "c-ink", value: S.total_events, label: "Clean events, 1995\u2013" + S.date_end.slice(0, 4) },
      { cls: "c-blue", value: g10.top_share_pct + "%", label: "Share of all events in the single busiest 10\u00b0 grid cell" },
      { cls: "c-gold", value: S.mean_magnitude, label: "Mean magnitude" },
      { cls: "c-green", value: S.rows_removed, label: "Duplicate rows removed during cleaning" },
      { cls: "c-violet", value: g10.top5_share_pct + "%", label: "Share of all events held by just the top 5 grid cells" },
      { cls: "c-coral", value: S.tsunami_events, label: "Events flagged with a tsunami warning" }
    ];
    el.innerHTML = cards.map(function (c) {
      return '<div class="stat-card ' + c.cls + '"><span class="stat-value">' + c.value +
        '</span><span class="stat-label">' + c.label + '</span></div>';
    }).join("");
  }

  // ---- Method section: grid comparison line ----
  function renderGridStatLine() {
    var el = document.getElementById("grid-stat-line");
    if (!el) return;
    var g5 = DATA.grids["5"], g10 = DATA.grids["10"], g20 = DATA.grids["20"];
    el.textContent =
      "5\u00b0 grid: top cell = " + g5.top_share_pct + "% of events   |   " +
      "10\u00b0 grid: top cell = " + g10.top_share_pct + "% of events   |   " +
      "20\u00b0 grid: top cell = " + g20.top_share_pct + "% of events";
  }

  // ---- Accordions ----
  function initAccordions() {
    var triggers = document.querySelectorAll(".accordion-trigger");
    triggers.forEach(function (btn) {
      var panel = btn.nextElementSibling;
      var inner = panel.querySelector(".accordion-panel-inner");
      function setState(open) {
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        panel.style.maxHeight = open ? inner.scrollHeight + "px" : "0px";
      }
      setState(btn.getAttribute("aria-expanded") === "true");
      btn.addEventListener("click", function () {
        setState(btn.getAttribute("aria-expanded") !== "true");
      });
      window.addEventListener("resize", function () {
        if (btn.getAttribute("aria-expanded") === "true") {
          panel.style.maxHeight = inner.scrollHeight + "px";
        }
      });
    });
  }

  // ---- Data table fallback ----
  function renderDataTable() {
    var body = document.getElementById("data-table-body");
    if (!body) return;
    var rows = DATA.events.slice().sort(function (a, b) {
      return (b.time || "").localeCompare(a.time || "");
    });
    var frag = document.createDocumentFragment();
    rows.forEach(function (e) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + (e.time || "Unknown") + "</td>" +
        "<td>" + escapeHtml(e.place) + "</td>" +
        "<td class=\"mono\">" + e.mag.toFixed(1) + "</td>" +
        "<td>" + e.cls + "</td>" +
        "<td>" + (e.depth !== null ? e.depth : "\u2014") + "</td>" +
        "<td>" + (e.tsunami ? "Yes" : "No") + "</td>";
      frag.appendChild(tr);
    });
    body.appendChild(frag);
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function initTableToggle() {
    var btn = document.getElementById("toggle-table");
    var wrap = document.getElementById("data-table-wrap");
    if (!btn || !wrap) return;
    var built = false;
    btn.addEventListener("click", function () {
      if (!built) { renderDataTable(); built = true; }
      var isOpen = wrap.classList.toggle("is-open");
      btn.textContent = isOpen ? "Hide data table" : "View as data table";
    });
  }

  // ---- Scroll reveal ----
  function initReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window) || items.length === 0) {
      items.forEach(function (i) { i.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    items.forEach(function (i) { io.observe(i); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderKpis();
    renderStatCollage();
    renderGridStatLine();
    initAccordions();
    initTableToggle();
    initReveal();
  });
})();
