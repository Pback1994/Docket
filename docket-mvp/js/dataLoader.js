// dataLoader.js

import { PAGE_MAP } from "./pageMap.js";

export async function loadPanelData(pageId, sectionId) {
  if (!pageId || !sectionId) return null;

  const page = PAGE_MAP[pageId];
  if (!page) return null;

  const path = page.sections[sectionId];
  if (!path) return null;

  try {
    const response = await fetch(path);
    if (!response.ok) return null;

    return await response.json();
  } catch (error) {
    console.error("Error loading panel data:", error);
    return null;
  }
}