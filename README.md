# Epicenter Index

A geospatial analysis of 29 years of significant global earthquakes, built as an interactive 3D web atlas. It answers one specific question with actual numbers instead of a general statement: where do earthquakes concentrate, and how much does that answer depend on the size of the grid you measure it with.

<p align="left">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-black?style=flat-square">
  <img alt="Made with HTML5" src="https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white">
  <img alt="Made with CSS3" src="https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white">
  <img alt="Made with JavaScript" src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black">
  <img alt="Plotly.js" src="https://img.shields.io/badge/Plotly.js-3F4F75?style=flat-square&logo=plotly&logoColor=white">
  <img alt="USGS Earthquake API" src="https://img.shields.io/badge/USGS-Earthquake%20API-2F5EFF?style=flat-square">
</p>

<p align="left">
  <a href="https://vaibhavnagare-gis.github.io/Epicenter_Index/" target="_blank">
    <img alt="Live Demo" src="https://img.shields.io/badge/Live%20Demo-View%20the%20Atlas-red?style=for-the-badge&logo=googlechrome&logoColor=white">
  </a>
</p>

## About

Epicenter Index is a single page web app built around one fixed, cited dataset: 998 significant earthquakes (magnitude 6.5 and above) recorded between 1995 and 2023. Instead of just plotting points on a map and calling it analysis, it grids the entire globe at three different resolutions (5 degrees, 10 degrees, and 20 degrees), counts events per cell, and shows exactly how the answer to "where is this concentrated" shifts depending on which grid you pick. That's the modifiable areal unit problem in practice, not just in theory.

Alongside the historical dataset, the atlas also has a Live Monitor: a second globe view that queries USGS's earthquake catalog directly for every magnitude 6.0-and-above event in the last 12 months. It's deliberately kept separate from the cited dataset, clearly labeled, and never mixed into the statistics or charts, so a visitor always knows which numbers are the fixed research dataset and which are live, changing data.

## Live Demo

**[vaibhavnagare-gis.github.io/Epicenter_Index](https://vaibhavnagare-gis.github.io/Epicenter_Index/)**

## Key Numbers

| | |
|---|---|
| Events analysed | 998 |
| Years covered | 1995 to 2023 (29 years) |
| Magnitude range | 6.5 to 9.1 |
| Median depth | 29 km |
| Tsunami-flagged events | 323 |
| Raw rows before cleaning | 1,000 (2 exact duplicates removed) |

## Features

- **Interactive 3D globe** built on Plotly's orthographic projection, with a satellite-style basemap, full drag-to-rotate and scroll-to-zoom, and marker size that scales with magnitude
- **Two globe modes in one view**: a Historical Dataset globe (the 998 cited events) and a Live Monitor globe (USGS's catalog, last 12 months, magnitude 6.0+), switchable without reloading the page
- **Grid based hotspot analysis** at three resolutions (5, 10, and 20 degrees), with a live-updating legend that shows the actual busiest, typical, and lowest cell counts for whichever grid is selected, not placeholder numbers
- **Live alert level filtering** on the Live Monitor globe, using the same official USGS PAGER alert colours (green, yellow, orange, red) that USGS itself uses, plus a minimum magnitude filter built from whatever range the live feed actually returns
- **A four step method walkthrough**: how the raw file was cleaned, how coordinates became real geometry, how the grid and cell counts were built, and how the magnitude classes were chosen to fit this specific dataset instead of a generic scale
- **An interpretation section** that is explicit about what the analysis does not claim: concentration is not the same as danger, the dataset excludes everything below magnitude 6.5, and different grid sizes give different, equally valid answers
- **Two supporting charts** (magnitude distribution and events per year) built with Plotly, each with a plain language caption explaining what the numbers actually show
- **A full data table view** of all 998 events as a fallback for anyone who wants the raw rows instead of the map
- **Fully cited sources**, with working links to the original Kaggle dataset listing, the USGS Earthquake Hazards Program, the CC0 licence the data is published under, and the exact USGS API the Live Monitor queries
- **No build step, no framework, and no bundler.** Everything runs from static files and one CDN script tag

## Tech Stack

| Layer | Tools |
|---|---|
| Structure and styling | HTML5, CSS3 |
| Interactivity | Vanilla JavaScript |
| 3D globe and charts | [Plotly.js](https://plotly.com/javascript/) (loaded via CDN, no bundler) |
| Historical dataset | Static JSON, embedded as a JavaScript file |
| Live earthquake data | [USGS FDSN Event Query API](https://earthquake.usgs.gov/fdsnws/event/1/) |
| Fonts | Space Grotesk, Inter, JetBrains Mono (Google Fonts) |
| Hosting | GitHub Pages |

## Data Sources

- **Historical dataset**: ["Earthquake", Faraz Rahman, Kaggle](https://www.kaggle.com/datasets/farazrahman/earthquake), originally sourced from the [U.S. Geological Survey (USGS) Earthquake Hazards Program](https://www.usgs.gov/programs/earthquake-hazards). Published under [CC0 1.0: Public Domain Dedication](https://creativecommons.org/publicdomain/zero/1.0/). The source file, `earthquake_95to23.csv`, is significant earthquakes only, magnitude 6.5 and above, 1995 to 2023, cleaned from 1,000 raw rows down to 998 after removing 2 exact duplicates.
- **Live data**: [USGS FDSN event query API](https://earthquake.usgs.gov/fdsnws/event/1/), queried directly from the browser for magnitude 6.0-and-above earthquakes in the last 12 months. This is a different selection method from the historical dataset (a fixed file versus a live, rolling window), so the two will never match exactly, and that difference is explained directly on the page.

## Repository Structure

```
Epicenter_Index/
├── index.html          Main page markup
├── css/
│   └── style.css        Full design system and layout
├── js/
│   ├── main.js           KPI strip, statistics cards, accordions, tab switching, scroll reveal
│   ├── globe.js           Historical globe: traces, layers, grid sizes, legend
│   ├── live-feed.js        Fetches the live USGS feed, shared by live-globe.js
│   ├── live-globe.js        Live globe: traces, alert filters, mode switching
│   └── charts.js           Magnitude distribution and annual trend charts
├── data/
│   └── earthquakes.js      The cleaned 998-event dataset, embedded as static JSON
├── assets/
│   └── Earthquake_Hero.png  Hero section illustration
└── README.md
```

## Running Locally

This is a static site with no build step. Most of it, including the historical globe, the grid hotspot analysis, and both charts, works by simply opening `index.html` directly in a browser, since the dataset is loaded as a script tag rather than fetched.

The **Live Monitor globe is the one exception**: it calls the USGS API with `fetch`, and browsers block that kind of request from a page opened directly off disk (the `file://` origin). To see the Live Monitor working, serve the folder with any local web server:

```bash
git clone https://github.com/VaibhavNagare-GIS/Epicenter_Index.git
cd Epicenter_Index
python3 -m http.server 8000
```

Then open `http://localhost:8000` in your browser. This step isn't needed once the site is deployed to GitHub Pages, since it's served over `https://` there.

## Limitations, stated directly

- The historical dataset only includes magnitude 6.5 and above, so it understates total seismic activity everywhere, not just in any one region.
- "Concentration" in the grid analysis means event count per cell, not risk, damage, or population exposure. A remote ocean region can rank high on event count while affecting almost no one.
- The grid size you choose changes the answer. That's shown deliberately, not hidden, but it means there is no single correct concentration number, only concentration at a stated resolution.
- The Live Monitor and the historical dataset use different selection criteria (a live, rolling 12 month window at magnitude 6.0+ versus a fixed file at magnitude 6.5+, 1995 to 2023) and will never show matching totals. That's expected, not a bug.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Connect

<p align="left">
  <a href="https://www.linkedin.com/in/vaibhav-nagare-gis" target="_blank">
    <img alt="LinkedIn" src="https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white">
  </a>
  <a href="https://github.com/VaibhavNagare-GIS" target="_blank">
    <img alt="GitHub" src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white">
  </a>
</p>

Made by Vaibhav Shivaji Nagare, a geoinformatics student, with 998 earthquakes doing the arguing for him.
