export async function loadSVG(containerId, svgPath) {
  const container = document.getElementById(containerId);
  const response = await fetch(svgPath);
  const svgText = await response.text();
  container.innerHTML = svgText;
}
