import {
  isWasmGCSupported,
  ready as wasmReady,
  renderToString as wasmRender,
} from "/vendor/plantuml/plantuml-wasm.js";
import { renderToString as jsRender } from "/vendor/plantuml/plantuml.js";

const editor = document.getElementById("editor");
const diagramEl = document.getElementById("diagram");
const errorBox = document.getElementById("error-box");
const statusEl = document.getElementById("status");
const btnSvg = document.getElementById("btn-svg");
const btnPng = document.getElementById("btn-png");

let currentSvg = "";
let renderEngine = jsRender;
let debounceTimer = null;

async function initializeEngine() {
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
      diagramEl.style.display = "block";
      diagramEl.innerHTML = svg;
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

editor.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(triggerRender, 350);
});

btnSvg.addEventListener("click", () => {
  if (!currentSvg) return;
  const blob = new Blob([currentSvg], { type: "image/svg+xml;charset=utf-8" });
  downloadBlob(blob, "diagram.svg");
});

btnPng.addEventListener("click", () => {
  if (!currentSvg) return;
  const svgElement = diagramEl.querySelector("svg");
  if (!svgElement) return;

  const bbox = svgElement.viewBox?.baseVal;
  const width = (bbox && bbox.width) || svgElement.clientWidth || 800;
  const height = (bbox && bbox.height) || svgElement.clientHeight || 600;
  const scale = 2; // 2x resolution for crisp PNG export

  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");

  const img = new Image();
  const svgBlob = new Blob([currentSvg], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(svgBlob);

  img.onload = () => {
    ctx.fillStyle = "#ffffff";
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
