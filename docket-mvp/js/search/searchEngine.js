import { PAGE_MAP } from "../pageMap.js";
import { loadSection, navigateToPage } from "../app.js";

let searchIndex = [];
let currentSearchTerm = "";
let searchDebounceTimer = null;

/* ---------------------------------- */
/* Build Search Index                  */
/* ---------------------------------- */

export async function initializeSearch() {
  await buildIndex();
  attachSearchListener();
}

async function buildIndex() {
  const entries = [];

  for (const pageId of Object.keys(PAGE_MAP)) {
    for (const sectionId of Object.keys(PAGE_MAP[pageId].sections)) {
      entries.push({
        pageId,
        sectionId,
        path: PAGE_MAP[pageId].sections[sectionId],
      });
    }
  }

  const results = await Promise.allSettled(
    entries.map(async ({ pageId, sectionId, path }) => {
      const response = await fetch(path);
      if (!response.ok) return null;
      const data = await response.json();
      return {
        pageId,
        sectionId,
        header: data.panel_header,
        summary: data.summary,
        regulation: data.regulation || "",
        tags: data.tags || [],
      };
    }),
  );

  searchIndex = results
    .filter((r) => r.status === "fulfilled" && r.value !== null)
    .map((r) => r.value);
}

/* ---------------------------------- */
/* Search                              */
/* ---------------------------------- */

function attachSearchListener() {
  const input = document.getElementById("search-input");
  if (!input) return;

  input.addEventListener("input", (e) => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => performSearch(e.target.value), 200);
  });

  input.addEventListener("keydown", (e) => {
    const results = document.querySelectorAll(".search-result");
    if (!results.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      results[0].focus();
    } else if (e.key === "Escape") {
      clearSearch();
    }
  });
}

export function performSearch(query) {
  currentSearchTerm = query;

  const resultsContainer = document.getElementById("search-results");
  if (!resultsContainer) return;

  if (!query.trim()) {
    resultsContainer.innerHTML = "";
    return;
  }

  const lowerQuery = query.toLowerCase();

  const results = searchIndex.filter(
    (item) =>
      item.header.toLowerCase().includes(lowerQuery) ||
      item.summary.toLowerCase().includes(lowerQuery) ||
      item.regulation.toLowerCase().includes(lowerQuery) ||
      item.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)),
  );

  resultsContainer.innerHTML = results
    .map(
      (result) => `
      <div class="search-result"
           data-page="${result.pageId}"
           data-section="${result.sectionId}"
           tabindex="-1"
           role="option">
        <span class="result-page-label">Page ${result.pageId.replace("page", "")}</span>
        <strong>${result.header}</strong>
        <p>${result.summary}</p>
      </div>
    `,
    )
    .join("");

  attachResultClicks();
}

function selectResult(result) {
  const pageId = result.dataset.page;
  const sectionId = result.dataset.section;
  document.getElementById("search-results").innerHTML = "";
  navigateToPage(pageId);
  loadSection(pageId, sectionId);
}

function attachResultClicks() {
  const results = Array.from(document.querySelectorAll(".search-result"));
  const input = document.getElementById("search-input");

  results.forEach((result, index) => {
    result.addEventListener("click", () => selectResult(result));

    result.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        selectResult(result);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = results[index + 1];
        if (next) next.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (index === 0) {
          input?.focus();
        } else {
          results[index - 1].focus();
        }
      } else if (e.key === "Escape") {
        clearSearch();
        input?.focus();
      }
    });
  });
}

/* ---------------------------------- */
/* Search State                        */
/* ---------------------------------- */

export function getCurrentSearchTerm() {
  return currentSearchTerm;
}

export function clearSearch() {
  currentSearchTerm = "";
  clearTimeout(searchDebounceTimer);
  const input = document.getElementById("search-input");
  if (input) input.value = "";
  const results = document.getElementById("search-results");
  if (results) results.innerHTML = "";
}
