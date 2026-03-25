// /js/renderers/panelRenderer.js

import { REGULATION_MAP } from "../config/regulationMap.js";
import { loadSection, getCurrentPage, navigateToPage } from "../app.js";
import { getCurrentSearchTerm } from "../search/searchEngine.js";
import { PAGE_MAP } from "../pageMap.js";

let currentData = null;
let activeTab = "reg_requirement";

/* ========================================= */
/* Main Render Function                      */
/* ========================================= */

export function renderPanel(data) {
  currentData = data;
  activeTab = "reg_requirement";

  const panel = document.getElementById("annotation-panel");
  if (!panel || !data) return;

  panel.innerHTML = `
    ${renderPanelHeader(data)}
    ${renderTabs()}
    <div class="panel-tab-area">
      ${renderTabContent(data, activeTab)}
    </div>
    ${renderCitations(data.citations)}
    ${renderFooterNav(data)}
  `;

  attachTabBehavior();
  attachCrossReferenceBehavior();
  attachFooterNavBehavior(data);
  attachRelatedFieldBehavior();
}

export function renderLoadingPanel() {
  const panel = document.getElementById("annotation-panel");
  if (!panel) return;

  panel.innerHTML = `
    <div class="panel-skeleton">
      <div class="skeleton-line skeleton-line--short"></div>
      <div class="skeleton-line skeleton-line--title"></div>
      <div class="skeleton-chips">
        <div class="skeleton-chip"></div>
        <div class="skeleton-chip"></div>
      </div>
      <div class="skeleton-tabs">
        <div class="skeleton-tab"></div>
        <div class="skeleton-tab"></div>
        <div class="skeleton-tab"></div>
      </div>
      <div class="skeleton-body">
        <div class="skeleton-line"></div>
        <div class="skeleton-line skeleton-line--wide"></div>
        <div class="skeleton-line skeleton-line--mid"></div>
        <div class="skeleton-block"></div>
        <div class="skeleton-line skeleton-line--wide"></div>
        <div class="skeleton-line skeleton-line--short"></div>
      </div>
    </div>
  `;
}

export function renderDefaultPanel() {
  const panel = document.getElementById("annotation-panel");
  if (!panel) return;

  panel.innerHTML = `
    <div class="panel-default">
      <p class="panel-default-heading">No section selected</p>
      <p class="panel-default-body">
        Click any highlighted region on the loan estimate to view a
        plain-language explanation, regulatory requirements, and
        common compliance questions for that section.
      </p>
    </div>
  `;
}

/* ========================================= */
/* Panel Header                              */
/* ========================================= */

function renderPanelHeader(data) {
  const nav = data.navigation || {};
  const breadcrumb = nav.section_group
    ? `${nav.section_group.toUpperCase()}${nav.field_number ? ` · FIELD ${nav.field_number} OF ${nav.field_total}` : ""}`
    : "";

  return `
    <div class="panel-header">
      ${breadcrumb ? `<p class="panel-breadcrumb">${breadcrumb}</p>` : ""}
      <h2 class="panel-title">${data.panel_header || ""}</h2>
      <div class="panel-chips">
        <span class="panel-chip panel-chip--reg">${data.regulation || ""}</span>
        ${nav.section_group ? `<span class="panel-chip">${nav.section_group}</span>` : ""}
        ${nav.page ? `<span class="panel-chip">Page ${nav.page}</span>` : ""}
      </div>
    </div>
  `;
}

/* ========================================= */
/* Tabs                                      */
/* ========================================= */

function renderTabs() {
  const tabs = [
    { id: "reg_requirement", icon: "📋", label: "Reg Requirement" },
    { id: "interpretation", icon: "📖", label: "Interpretation" },
    { id: "examiner_view", icon: "🔍", label: "Examiner View" },
  ];

  return `
    <div class="panel-tabs" role="tablist" aria-label="Annotation sections">
      ${tabs
        .map(
          (t) => `
        <button class="panel-tab${t.id === activeTab ? " active" : ""}"
                data-tab="${t.id}"
                role="tab"
                aria-selected="${t.id === activeTab ? "true" : "false"}"
                tabindex="${t.id === activeTab ? "0" : "-1"}">
          <span class="tab-icon">${t.icon}</span>${t.label}
        </button>
      `,
        )
        .join("")}
    </div>
  `;
}

function renderTabContent(data, tab) {
  if (tab === "reg_requirement") {
    const rr = data.reg_requirement || {};
    return `
      ${rr.intro ? `<p class="panel-intro">${highlightText(convertRegulationReferences(rr.intro))}</p>` : ""}
      ${renderCards(rr.cards || [])}
      ${renderToleranceCard(data.tolerance)}
      ${renderChangedCircumstanceCard(data.changed_circumstance)}
      ${renderRelatedFields(data.related_fields)}
    `;
  }

  if (tab === "interpretation") {
    const interp = data.interpretation || {};
    return `
      ${interp.intro ? `<p class="panel-intro">${highlightText(convertRegulationReferences(interp.intro))}</p>` : ""}
      ${renderCards(interp.cards || [])}
    `;
  }

  if (tab === "examiner_view") {
    const ev = data.examiner_view || {};
    return `
      ${renderExaminerMeta(ev)}
      ${renderExaminerCards("common_errors", ev.common_errors)}
      ${renderExaminerCards("tips", ev.tips)}
    `;
  }

  return "";
}

/* ========================================= */
/* Cards                                     */
/* ========================================= */

function renderCards(cards) {
  if (!Array.isArray(cards) || cards.length === 0) return "";

  return cards
    .map(
      (card) => `
    <div class="panel-card">
      <p class="panel-card-title">${card.title || ""}</p>
      <p class="panel-card-body">${highlightText(convertRegulationReferences(card.content || ""))}</p>
    </div>
  `,
    )
    .join("");
}

function renderToleranceCard(tolerance) {
  if (!tolerance) return "";

  const labels = {
    zero: "Zero Tolerance",
    "10-percent": "10% Tolerance",
    unlimited: "Unlimited Tolerance",
  };
  const label = labels[tolerance.category] || tolerance.category;

  return `
    <div class="panel-card panel-card--${tolerance.category}">
      <p class="panel-card-title">${label}</p>
      <p class="panel-card-body">${tolerance.description}${tolerance.regulatory_cite ? ` <span class="card-cite">${tolerance.regulatory_cite}</span>` : ""}</p>
    </div>
  `;
}

function renderChangedCircumstanceCard(cc) {
  if (!cc || !cc.can_trigger_revised_le) return "";

  const triggerList = cc.triggers
    .map((t) => `<li>${t}</li>`)
    .join("");

  return `
    <div class="panel-card panel-card--cc">
      <p class="panel-card-title">May Trigger Revised LE</p>
      <p class="panel-card-body">Changes to this field may require a revised Loan Estimate if:${cc.regulatory_cite ? ` <span class="card-cite">${cc.regulatory_cite}</span>` : ""}</p>
      <ul class="card-trigger-list">${triggerList}</ul>
    </div>
  `;
}

/* ========================================= */
/* Examiner View                             */
/* ========================================= */

function renderExaminerMeta(ev) {
  if (!ev.why_it_matters && !ev.how_reviewed) return "";

  return `
    <div class="examiner-meta">
      ${ev.why_it_matters ? `
        <div class="examiner-meta-block">
          <p class="examiner-meta-label">Why It Matters</p>
          <p class="examiner-meta-body">${ev.why_it_matters}</p>
        </div>` : ""}
      ${ev.how_reviewed ? `
        <div class="examiner-meta-block">
          <p class="examiner-meta-label">How It's Reviewed</p>
          <p class="examiner-meta-body">${ev.how_reviewed}</p>
        </div>` : ""}
    </div>
  `;
}

function renderExaminerCards(type, items) {
  if (!Array.isArray(items) || items.length === 0) return "";

  const isError = type === "common_errors";
  const icon = isError ? "⚠️" : "💡";
  const heading = isError ? "Common Errors" : "Tips";
  const modClass = isError ? "examiner-card--error" : "examiner-card--tip";

  const cards = items
    .map(
      (item) => `
      <div class="examiner-card ${modClass}">
        <div class="examiner-card-icon">${icon}</div>
        <div class="examiner-card-body">
          <p class="examiner-card-title">${item.title || ""}</p>
          <p class="examiner-card-desc">${item.description || ""}</p>
          ${item.cite ? `<span class="examiner-card-cite">${item.cite}</span>` : ""}
        </div>
      </div>
    `,
    )
    .join("");

  return `
    <div class="examiner-section">
      <p class="examiner-section-heading">${heading}</p>
      ${cards}
    </div>
  `;
}

/* ========================================= */
/* Citations                                 */
/* ========================================= */

function renderCitations(citations) {
  if (!Array.isArray(citations) || citations.length === 0) return "";

  return `
    <div class="citation-list">
      ${citations
        .map((c) => {
          const tag = c.url ? "a" : "div";
          const attrs = c.url
            ? `href="${c.url}" target="_blank" rel="noopener noreferrer" class="citation-item citation-item--linked"`
            : `class="citation-item"`;
          return `
        <${tag} ${attrs}>
          <span class="citation-icon">⚖️</span>
          <div class="citation-text">
            <span class="citation-cite">${c.cite}</span>
            <span class="citation-label">${c.label}</span>
          </div>
          <span class="citation-arrow">↗</span>
        </${tag}>
      `;
        })
        .join("")}
    </div>
  `;
}

/* ========================================= */
/* Footer Navigation                         */
/* ========================================= */

function renderFooterNav(data) {
  const nav = data.navigation || {};
  const hasPrev = !!nav.prev_field_id;
  const hasNext = !!nav.next_field_id;

  if (!hasPrev && !hasNext) return "";

  const centerText =
    nav.section_group && nav.field_number
      ? `Field ${nav.field_number} of ${nav.field_total}<br><span class="footer-group">${nav.section_group}</span>`
      : "";

  return `
    <div class="panel-footer-nav">
      <button class="footer-nav-btn" id="panel-prev" ${hasPrev ? "" : "disabled"}>← Prev</button>
      <div class="panel-footer-center">${centerText}</div>
      <button class="footer-nav-btn" id="panel-next" ${hasNext ? "" : "disabled"}>Next →</button>
    </div>
  `;
}

function attachFooterNavBehavior(data) {
  const nav = data.navigation || {};
  const prevBtn = document.getElementById("panel-prev");
  const nextBtn = document.getElementById("panel-next");

  if (prevBtn && nav.prev_field_id) {
    prevBtn.addEventListener("click", () => {
      const targetPage = Object.keys(PAGE_MAP).find(
        (pageId) => nav.prev_field_id in PAGE_MAP[pageId].sections,
      );
      if (!targetPage) return;
      if (targetPage !== getCurrentPage()) navigateToPage(targetPage);
      loadSection(targetPage, nav.prev_field_id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (nextBtn && nav.next_field_id) {
    nextBtn.addEventListener("click", () => {
      const targetPage = Object.keys(PAGE_MAP).find(
        (pageId) => nav.next_field_id in PAGE_MAP[pageId].sections,
      );
      if (!targetPage) return;
      if (targetPage !== getCurrentPage()) navigateToPage(targetPage);
      loadSection(targetPage, nav.next_field_id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
}

/* ========================================= */
/* Tab Behavior                              */
/* ========================================= */

function activateTab(tab, tabs) {
  activeTab = tab.dataset.tab;
  tabs.forEach((t) => {
    t.classList.remove("active");
    t.setAttribute("aria-selected", "false");
    t.setAttribute("tabindex", "-1");
  });
  tab.classList.add("active");
  tab.setAttribute("aria-selected", "true");
  tab.setAttribute("tabindex", "0");
  document.querySelector(".panel-tab-area").innerHTML = renderTabContent(
    currentData,
    activeTab,
  );
  attachCrossReferenceBehavior();
  attachRelatedFieldBehavior();
}

function attachTabBehavior() {
  const tabs = Array.from(document.querySelectorAll(".panel-tab"));
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activateTab(tab, tabs));
    tab.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        const next = tabs[(index + 1) % tabs.length];
        next.focus();
        activateTab(next, tabs);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        const prev = tabs[(index - 1 + tabs.length) % tabs.length];
        prev.focus();
        activateTab(prev, tabs);
      }
    });
  });
}

/* ========================================= */
/* Related Fields                            */
/* ========================================= */

function labelFromSectionId(id) {
  // Strip the regulation prefix (e.g. "1026-37-a-1-") leaving the slug
  const slug = id.replace(/^1026-37-[a-z]-\d+-/, "").replace(/^1026-37-[a-z]-/, "");
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function renderRelatedFields(relatedIds) {
  if (!Array.isArray(relatedIds) || relatedIds.length === 0) return "";

  const chips = relatedIds
    .map(
      (id) =>
        `<button class="related-field-link" data-section-id="${id}">${labelFromSectionId(id)}</button>`,
    )
    .join("");

  return `
    <div class="panel-related">
      <p class="panel-related-heading">Related Fields</p>
      <div class="panel-related-list">${chips}</div>
    </div>
  `;
}

function attachRelatedFieldBehavior() {
  document.querySelectorAll(".related-field-link").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sectionId = btn.dataset.sectionId;
      const targetPage = Object.keys(PAGE_MAP).find(
        (pageId) => sectionId in PAGE_MAP[pageId].sections,
      );
      if (!targetPage) return;
      if (targetPage !== getCurrentPage()) navigateToPage(targetPage);
      loadSection(targetPage, sectionId);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

/* ========================================= */
/* Regulation Cross-Linking                  */
/* ========================================= */

function convertRegulationReferences(text) {
  return text.replace(/§?1026\.37\([a-gj-l]\)/g, (match) => {
    const normalized = match.replace("§", "");
    return `<span class="reg-link" data-reg="${normalized}">${match}</span>`;
  });
}

function attachCrossReferenceBehavior() {
  const links = document.querySelectorAll(".reg-link");

  links.forEach((link) => {
    link.addEventListener("click", () => {
      const regulation = link.dataset.reg;
      const sectionId = REGULATION_MAP[regulation];
      if (!sectionId) return;

      const targetPage = Object.keys(PAGE_MAP).find(
        (pageId) => sectionId in PAGE_MAP[pageId].sections,
      );
      if (!targetPage) return;

      if (targetPage !== getCurrentPage()) navigateToPage(targetPage);
      loadSection(targetPage, sectionId);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

/* ========================================= */
/* Search Highlighting                       */
/* ========================================= */

function highlightText(text) {
  const term = getCurrentSearchTerm();
  if (!term || !text) return text;

  const escaped = escapeRegExp(term);
  const regex = new RegExp(`(${escaped})`, "gi");

  return text.replace(regex, `<span class="highlight">$1</span>`);
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
