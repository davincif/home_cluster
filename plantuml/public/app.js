import {
  isWasmGCSupported,
  ready as wasmReady,
  renderToString as wasmRender,
} from "/vendor/plantuml/plantuml-wasm.js";
import { renderToString as jsRender } from "/vendor/plantuml/plantuml.js";

const STORAGE_KEY = "plantuml_studio_script";
const THEME_STORAGE_KEY = "plantuml_studio_theme";
const LIGHT_BG = "#ffffff";
const DARK_BG = "#11111b";
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 4.0;
const ZOOM_STEP = 0.2;

const editor = document.getElementById("editor");
const previewWrapper = document.getElementById("preview-wrapper");
const previewContainer = document.getElementById("preview-container");
const diagramEl = document.getElementById("diagram");
const errorBox = document.getElementById("error-box");
const statusEl = document.getElementById("status");
const btnTheme = document.getElementById("btn-theme");
const btnSvg = document.getElementById("btn-svg");
const btnPng = document.getElementById("btn-png");
const btnZoomIn = document.getElementById("btn-zoom-in");
const btnZoomOut = document.getElementById("btn-zoom-out");
const btnZoomReset = document.getElementById("btn-zoom-reset");
const zoomLevelEl = document.getElementById("zoom-level");

let currentSvg = "";
let renderEngine = jsRender;
let debounceTimer = null;
let currentZoom = 1.0;
let currentTheme = "light";
let baseWidth = 0;
let baseHeight = 0;

let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let scrollStartLeft = 0;
let scrollStartTop = 0;

function loadSavedScript() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null && saved.trim().length > 0) {
      editor.value = saved;
    }
  } catch (err) {
    console.warn("Unable to read from localStorage:", err);
  }
}

function saveScript() {
  try {
    localStorage.setItem(STORAGE_KEY, editor.value);
  } catch (err) {
    console.warn("Unable to save to localStorage:", err);
  }
}

function getThemeBackgroundColor() {
  return currentTheme === "dark" ? DARK_BG : LIGHT_BG;
}

function getThemedSvgString() {
  if (!currentSvg) return "";
  const bg = getThemeBackgroundColor();
  return currentSvg.replace(/background\s*:\s*#[0-9a-fA-F]{3,6}/i, `background:${bg}`);
}

function applyTheme() {
  const isDark = currentTheme === "dark";
  previewWrapper.classList.toggle("theme-dark", isDark);
  btnTheme.textContent = isDark ? "☀️" : "🌙";
  btnTheme.title = isDark
    ? "Switch Image Background to Light"
    : "Switch Image Background to Dark";

  const svgElement = diagramEl.querySelector("svg");
  if (svgElement) {
    svgElement.style.background = getThemeBackgroundColor();
  }
}

function loadSavedTheme() {
  try {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === "dark" || savedTheme === "light") {
      currentTheme = savedTheme;
    }
  } catch (err) {
    console.warn("Unable to read theme from localStorage:", err);
  }
  applyTheme();
}

function toggleTheme() {
  currentTheme = currentTheme === "dark" ? "light" : "dark";
  try {
    localStorage.setItem(THEME_STORAGE_KEY, currentTheme);
  } catch (err) {
    console.warn("Unable to save theme to localStorage:", err);
  }
  applyTheme();
}

function extractIntrinsicDimensions(svgElement) {
  const bbox = svgElement.viewBox?.baseVal;
  const attrWidth = parseFloat(svgElement.getAttribute("width"));
  const attrHeight = parseFloat(svgElement.getAttribute("height"));
  const styleWidth = parseFloat(svgElement.style?.width);
  const styleHeight = parseFloat(svgElement.style?.height);

  const width =
    (bbox && bbox.width) ||
    attrWidth ||
    styleWidth ||
    svgElement.getBoundingClientRect().width ||
    800;
  const height =
    (bbox && bbox.height) ||
    attrHeight ||
    styleHeight ||
    svgElement.getBoundingClientRect().height ||
    600;

  if (!svgElement.getAttribute("viewBox")) {
    svgElement.setAttribute("viewBox", `0 0 ${width} ${height}`);
  }

  return { width, height };
}

function applyZoom() {
  zoomLevelEl.textContent = `${Math.round(currentZoom * 100)}%`;
  btnZoomOut.disabled = currentZoom <= ZOOM_MIN;
  btnZoomIn.disabled = currentZoom >= ZOOM_MAX;

  const svgElement = diagramEl.querySelector("svg");
  if (!svgElement || !baseWidth || !baseHeight) return;

  const scaledWidth = Math.round(baseWidth * currentZoom);
  const scaledHeight = Math.round(baseHeight * currentZoom);

  svgElement.setAttribute("width", `${scaledWidth}px`);
  svgElement.setAttribute("height", `${scaledHeight}px`);
  svgElement.style.width = `${scaledWidth}px`;
  svgElement.style.height = `${scaledHeight}px`;
}

function setZoom(newZoom) {
  currentZoom = Math.min(
    ZOOM_MAX,
    Math.max(ZOOM_MIN, Number(newZoom.toFixed(2))),
  );
  applyZoom();
}

function resetZoom() {
  currentZoom = 1.0;
  applyZoom();
}

async function initializeEngine() {
  loadSavedScript();
  loadSavedTheme();

  try {
    if (isWasmGCSupported()) {
      await wasmReady({ wasm: fetch("/vendor/plantuml/plantuml.wasm") });
      renderEngine = wasmRender;
      statusEl.textContent = "Engine ready (Wasm GC)";
    } else {
      statusEl.textContent = "Engine ready (JS mode)";
    }
    triggerRender();
  } catch (err) {
    console.warn("WASM init failed, falling back to JS engine:", err);
    statusEl.textContent = "Engine ready (JS fallback)";
    triggerRender();
  }
}

function triggerRender() {
  statusEl.textContent = "Rendering in browser...";
  const lines = editor.value.split(/\r?\n/);

  renderEngine(
    lines,
    (svg) => {
      currentSvg = svg;
      errorBox.style.display = "none";
      diagramEl.style.display = "inline-block";
      diagramEl.innerHTML = svg;

      const svgElement = diagramEl.querySelector("svg");
      if (svgElement) {
        const dims = extractIntrinsicDimensions(svgElement);
        baseWidth = dims.width;
        baseHeight = dims.height;
        applyZoom();
        applyTheme();
      }

      btnSvg.disabled = false;
      btnPng.disabled = false;
      statusEl.textContent = "Rendered locally";
    },
    (errMessage) => {
      diagramEl.style.display = "none";
      errorBox.style.display = "block";
      errorBox.textContent = errMessage;
      btnSvg.disabled = true;
      btnPng.disabled = true;
      statusEl.textContent = "Syntax error";
    },
  );
}

btnTheme.addEventListener("click", toggleTheme);
btnZoomIn.addEventListener("click", () => setZoom(currentZoom + ZOOM_STEP));
btnZoomOut.addEventListener("click", () => setZoom(currentZoom - ZOOM_STEP));
btnZoomReset.addEventListener("click", resetZoom);

previewContainer.addEventListener(
  "wheel",
  (event) => {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      const direction = event.deltaY < 0 ? 1 : -1;
      setZoom(currentZoom + direction * ZOOM_STEP);
    }
  },
  { passive: false },
);

previewContainer.addEventListener("mousedown", (event) => {
  if (event.button !== 0) return;
  isDragging = true;
  dragStartX = event.clientX;
  dragStartY = event.clientY;
  scrollStartLeft = previewContainer.scrollLeft;
  scrollStartTop = previewContainer.scrollTop;
  previewContainer.classList.add("dragging");
});

window.addEventListener("mousemove", (event) => {
  if (!isDragging) return;
  const dx = event.clientX - dragStartX;
  const dy = event.clientY - dragStartY;
  previewContainer.scrollLeft = scrollStartLeft - dx;
  previewContainer.scrollTop = scrollStartTop - dy;
});

window.addEventListener("mouseup", () => {
  if (!isDragging) return;
  isDragging = false;
  previewContainer.classList.remove("dragging");
});

editor.addEventListener("input", () => {
  saveScript();
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(triggerRender, 350);
});

btnSvg.addEventListener("click", () => {
  if (!currentSvg) return;
  const blob = new Blob([getThemedSvgString()], {
    type: "image/svg+xml;charset=utf-8",
  });
  downloadBlob(blob, "diagram.svg");
});

btnPng.addEventListener("click", () => {
  if (!currentSvg) return;
  const width = baseWidth || 800;
  const height = baseHeight || 600;
  const scale = 2; // 2x resolution for crisp PNG export

  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");

  const img = new Image();
  const svgBlob = new Blob([getThemedSvgString()], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(svgBlob);

  img.onload = () => {
    ctx.fillStyle = getThemeBackgroundColor();
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);

    canvas.toBlob((pngBlob) => {
      if (pngBlob) downloadBlob(pngBlob, "diagram.png");
    }, "image/png");
  };
  img.src = url;
});

function downloadBlob(blob, filename) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

initializeEngine();
