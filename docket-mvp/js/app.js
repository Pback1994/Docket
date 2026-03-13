import { loadPanelData } from "./dataLoader.js";
import { initializeSearch, clearSearch } from "./search/searchEngine.js";

const PAGES = ["page1", "page2", "page3"];
const TOTAL_PAGES = PAGES.length;

// Per-page image source and SVG overlay rect definitions
const PAGE_CONFIG = {
  page1: {
    img: "./assets/img/page1.png",
    rects: [
      // §1026.37(a) — General Information
      // Coordinates are estimates — fine-tune visually in browser
      { section: "1026-37-a-1-date-issued",               x: 20, y: 103,  width: 235, height: 15 },
      { section: "1026-37-a-2-applicants",                x: 20,  y: 120,  width: 235, height: 10 },
      { section: "1026-37-a-3-property",                  x: 20,  y: 132, width: 235, height: 45 },
      { section: "1026-37-a-4-sale-price",                x: 20, y: 180, width: 235, height: 15 },
      { section: "1026-37-a-5-loan-term",                 x: 295,  y: 80, width: 295, height: 13 },
      { section: "1026-37-a-6-purpose",                   x: 295, y: 94, width: 295, height: 11 },
      { section: "1026-37-a-7-product",                   x: 295, y: 107, width: 295, height: 11 },
      { section: "1026-37-a-8-loan-type",                 x: 295, y: 120, width: 295, height: 11 },
      { section: "1026-37-a-9-loan-id",                   x: 295,  y: 132, width: 295, height: 11 },
      { section: "1026-37-a-10-rate-lock",                x: 295, y: 144, width: 295, height: 45 },
      // §1026.37(b) — Loan Terms
      { section: "1026-37-b-1-loan-amount",               x: 20,  y: 204, width: 570, height: 40 },
      { section: "1026-37-b-2-interest-rate",             x: 20,  y: 250, width: 570, height: 23 },
      { section: "1026-37-b-3-principal-interest",        x: 20,  y: 280, width: 570, height: 46 },
      { section: "1026-37-b-4-prepayment-penalty",        x: 20,  y: 330, width: 570, height: 46 },
      { section: "1026-37-b-5-balloon-payment",           x: 20,  y: 380, width: 570, height: 20 },
      // §1026.37(c) — Projected Payments
      { section: "1026-37-c-projected-payments",          x: 20,  y: 410, width: 570, height: 155 },
      // §1026.37(d) — Costs at Closing
      { section: "1026-37-d-1-estimated-closing-costs",   x: 20,  y: 679, width: 570, height: 30 },
      { section: "1026-37-d-2-estimated-cash-to-close",   x: 20,  y: 713, width: 570, height: 32 },
    ],
  },
  page2: {
    img: "./assets/img/page2.png",
    rects: [
      // Page 2 is two-column: Loan Costs (left) | Other Costs (right)
      // then Calculating Cash to Close spans full width at the bottom
      { section: "1026-37-e-loan-costs",                x: 20,  y: 40,  width: 275, height: 577 },
      { section: "1026-37-f-other-costs",               x: 305, y: 40,  width: 285, height: 421 },
      { section: "1026-37-g-calculating-cash-to-close", x: 305,  y: 467, width: 285, height: 150 },
    ],
  },
  page3: {
    img: "./assets/img/page3.png",
    rects: [
      { section: "1026-37-j-contact-information",  x: 20, y: 30,  width: 570, height: 135 },
      { section: "1026-37-k-comparisons",          x: 20, y: 195, width: 570, height: 135 },
      { section: "1026-37-l-other-considerations", x: 20, y: 343, width: 570, height: 265 },
    ],
  },
};

let currentPage = "page1";
let activeRect = null;

/* ---------------------------------- */
/* Public API */
/* ---------------------------------- */

export function getCurrentPage() {
  return currentPage;
}

export async function loadSection(pageId, sectionId) {
  const data = await loadPanelData(pageId, sectionId);
  if (!data) return;

  const { renderPanel } = await import("./renderers/panelRenderer.js");
  renderPanel(data);

  updateURL(pageId, sectionId);
}

/* ---------------------------------- */
/* Page Navigation */
/* ---------------------------------- */

export function navigateToPage(pageId) {
  currentPage = pageId;

  const config = PAGE_CONFIG[pageId];
  const pageIndex = PAGES.indexOf(pageId);

  // Swap the page image
  document.querySelector(".page-background").src = config.img;

  // Rebuild SVG overlay rects for this page
  const svg = document.querySelector(".overlay");
  svg.innerHTML = config.rects
    .map(
      (r) =>
        `<rect data-section="${r.section}" x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" />`,
    )
    .join("");

  // Reset active rect when changing pages
  activeRect = null;

  // Re-attach click listeners to the new rects
  attachOverlayListeners();

  // Update page indicator
  document.getElementById("page-indicator").textContent =
    `Page ${pageIndex + 1} of ${TOTAL_PAGES}`;

  // Enable/disable prev and next buttons
  document.getElementById("btn-prev").disabled = pageIndex === 0;
  document.getElementById("btn-next").disabled = pageIndex === TOTAL_PAGES - 1;

  // Reset the annotation panel to default state
  import("./renderers/panelRenderer.js").then(({ renderDefaultPanel }) => renderDefaultPanel());

  updateURL(pageId, null);
}

/* ---------------------------------- */
/* URL Management */
/* ---------------------------------- */

function updateURL(pageId, sectionId) {
  const params = new URLSearchParams();
  params.set("page", pageId);
  if (sectionId) params.set("section", sectionId);

  history.pushState({}, "", `?${params.toString()}`);
}

async function handleInitialLoad() {
  const params = new URLSearchParams(window.location.search);

  const page = params.get("page") || "page1";
  const section = params.get("section");

  navigateToPage(page);

  if (section) {
    loadSection(page, section);
  } else {
    const { renderDefaultPanel } = await import("./renderers/panelRenderer.js");
    renderDefaultPanel();
  }
}

/* ---------------------------------- */
/* Init */
/* ---------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  attachNavListeners();
  handleInitialLoad();
  initializeSearch();
});

/* ---------------------------------- */
/* Nav Button Binding */
/* ---------------------------------- */

function attachNavListeners() {
  document.getElementById("btn-prev").addEventListener("click", () => {
    const pageIndex = PAGES.indexOf(currentPage);
    if (pageIndex > 0) navigateToPage(PAGES[pageIndex - 1]);
  });

  document.getElementById("btn-next").addEventListener("click", () => {
    const pageIndex = PAGES.indexOf(currentPage);
    if (pageIndex < TOTAL_PAGES - 1) navigateToPage(PAGES[pageIndex + 1]);
  });
}

/* ---------------------------------- */
/* Overlay Click Binding */
/* ---------------------------------- */

function attachOverlayListeners() {
  const regions = document.querySelectorAll("[data-section]");

  regions.forEach((region) => {
    region.addEventListener("click", () => {
      // Update active region highlight
      if (activeRect) activeRect.classList.remove("active");
      region.classList.add("active");
      activeRect = region;

      // Clear any lingering search state
      clearSearch();

      loadSection(currentPage, region.dataset.section);
    });
  });
}
