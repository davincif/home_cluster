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
const MAX_PNG_DIMENSION = 16384;

const FORBIDDEN_SVG_TAGS = new Set([
  "script",
  "foreignobject",
  "iframe",
  "object",
  "embed",
  "applet",
  "base",
  "meta",
  "link",
  "html",
  "head",
  "body",
  "audio",
  "video",
  "canvas",
  "animate",
  "set",
  "animatemotion",
  "animatetransform",
]);

const URL_ATTRIBUTES = new Set([
  "href",
  "xlink:href",
  "src",
  "action",
  "formaction",
  "poster",
  "data",
]);

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

function isSafeCssText(cssText) {
  const normalized = cssText.replace(/\/\*[\s\S]*?\*\//g, "").trim();
  if (/javascript\s*:|vbscript\s*:|expression\s*\(|@import/i.test(normalized)) {
    return false;
  }
  const urlMatches = normalized.matchAll(/url\s*\(\s*(['"]?)(.*?)\1\s*\)/gi);
  for (const match of urlMatches) {
    const target = (match[2] || "").trim();
    if (!target.startsWith("#")) {
      return false;
    }
  }
  return true;
}

function isSafeUrlForTag(tagName, rawValue) {
  const cleaned = rawValue.replace(/[\u0000-\u0020\u007f]/g, "");
  if (cleaned.startsWith("#")) {
    return true;
  }
  if (tagName === "a") {
    return /^(https?:|mailto:)/i.test(cleaned);
  }
  if (tagName === "image") {
    return /^data:image\/(png|jpeg|jpg|gif|webp);base64,[a-z0-9+/=]+$/i.test(
      cleaned,
    );
  }
  return false;
}

/**
 * Sanitizes a PlantUML-generated SVG string by parsing it as XML and
 * stripping executable elements, event handlers, and unsafe URLs/CSS.
 */
function sanitizeSvg(rawSvg) {
  if (typeof rawSvg !== "string" || !rawSvg.trim()) {
    return null;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(rawSvg, "image/svg+xml");
  const parserError = doc.querySelector("parsererror");
  const root = doc.documentElement;

  if (parserError || !root || root.tagName.toLowerCase() !== "svg") {
    return null;
  }

  const elements = [root, ...root.querySelectorAll("*")];
  for (const el of elements) {
    const tag = el.tagName.toLowerCase();
    if (FORBIDDEN_SVG_TAGS.has(tag)) {
      el.remove();
      continue;
    }

    if (tag === "style" && !isSafeCssText(el.textContent || "")) {
      el.remove();
      continue;
    }

    for (const attr of [...el.attributes]) {
      const attrName = attr.name.toLowerCase();
      const localName = attrName.includes(":")
        ? attrName.split(":").pop()
        : attrName;

      if (attrName.startsWith("on") || localName.startsWith("on")) {
        el.removeAttribute(attr.name);
        continue;
      }

      if (attrName === "style" && !isSafeCssText(attr.value)) {
        el.removeAttribute(attr.name);
        continue;
      }

      if (URL_ATTRIBUTES.has(attrName) || URL_ATTRIBUTES.has(localName)) {
        if (!isSafeUrlForTag(tag, attr.value)) {
          el.removeAttribute(attr.name);
        }
      }
    }
  }

  return root;
}

function getThemedSvgString() {
  if (!currentSvg) return "";
  const sanitizedRoot = sanitizeSvg(currentSvg);
  if (!sanitizedRoot) return "";
  sanitizedRoot.style.background = getThemeBackgroundColor();
  return new XMLSerializer().serializeToString(sanitizedRoot);
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
      const sanitizedRoot = sanitizeSvg(svg);
      if (!sanitizedRoot) {
        diagramEl.style.display = "none";
        errorBox.style.display = "block";
        errorBox.textContent = "Invalid or unsafe SVG output rejected.";
        btnSvg.disabled = true;
        btnPng.disabled = true;
        statusEl.textContent = "Render blocked";
        return;
      }

      currentSvg = new XMLSerializer().serializeToString(sanitizedRoot);
      errorBox.style.display = "none";
      diagramEl.style.display = "inline-block";
      diagramEl.replaceChildren(document.importNode(sanitizedRoot, true));

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
  const desiredScale = 2; // 2x resolution for crisp PNG export
  const scale = Math.min(
    desiredScale,
    MAX_PNG_DIMENSION / Math.max(width, height, 1),
  );

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
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
