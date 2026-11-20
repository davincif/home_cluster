import * as esbuild from "/vendor/esbuild-wasm/esm/browser.min.js";
import { renderNavigation } from "/shared/nav.js";
import { loadMonaco } from "/shared/monaco-loader.js";
import { bindExamplesMenu } from "/shared/examples-menu.js";
import { JS_TS_EXAMPLES, DEFAULT_SNIPPETS } from "/js/examples.js";

const STORAGE_CODE_KEY = "web_playgrounds_js_code";
const STORAGE_MODE_KEY = "web_playgrounds_js_mode";
const EXECUTION_TIMEOUT_MS = 5000;
const MAX_CONSOLE_LINES = 500;

const navRoot = document.getElementById("nav-root");
const editorContainer = document.getElementById("editor-container");
const langSelect = document.getElementById("lang-select");
const exampleSelect = document.getElementById("example-select");
const btnRun = document.getElementById("btn-run");
const btnStop = document.getElementById("btn-stop");
const btnReset = document.getElementById("btn-reset");
const btnClear = document.getElementById("btn-clear");
const statusText = document.getElementById("status-text");
const execMeta = document.getElementById("exec-meta");
const consoleOutput = document.getElementById("console-output");
const transpiledOutput = document.getElementById("transpiled-output");
const transpiledCodeEl = document.getElementById("transpiled-code");
const tabConsole = document.getElementById("tab-console");
const tabTranspiled = document.getElementById("tab-transpiled");
const sandboxHost = document.getElementById("sandbox-host");

let monacoRef = null;
let editor = null;
let currentMode = loadSavedMode();
let esbuildReady = false;
let activeSandbox = null;
let activeRunId = null;
let timeoutHandle = null;
let consoleLineCount = 0;

function loadSavedMode() {
  try {
    const saved = localStorage.getItem(STORAGE_MODE_KEY);
    if (saved === "js" || saved === "ts") return saved;
  } catch {
    // Ignore storage errors in restricted browser contexts
  }
  return "ts";
}

function loadSavedCode(mode) {
  try {
    const saved = localStorage.getItem(STORAGE_CODE_KEY);
    if (saved !== null && saved.trim().length > 0) {
      return saved;
    }
  } catch {
    // Ignore storage errors
  }
  return DEFAULT_SNIPPETS[mode];
}

function saveState() {
  if (!editor) return;
  try {
    localStorage.setItem(STORAGE_CODE_KEY, editor.getValue());
    localStorage.setItem(STORAGE_MODE_KEY, currentMode);
  } catch {
    // Ignore quota or storage errors
  }
}

function setStatus(message, state = "") {
  statusText.textContent = message;
  statusText.className = "status-text";
  if (state === "ready") statusText.classList.add("is-ready");
  if (state === "error") statusText.classList.add("is-error");
}

function clearConsole(showPlaceholder = false) {
  consoleLineCount = 0;
  if (showPlaceholder) {
    const placeholder = document.createElement("div");
    placeholder.className = "console-empty";
    placeholder.textContent = "Console cleared.";
    consoleOutput.replaceChildren(placeholder);
    return;
  }
  consoleOutput.replaceChildren();
}

function appendConsoleLine(level, text) {
  if (consoleLineCount === 0) {
    consoleOutput.replaceChildren();
  }

  if (consoleLineCount >= MAX_CONSOLE_LINES) {
    if (consoleLineCount === MAX_CONSOLE_LINES) {
      consoleLineCount += 1;
      const notice = document.createElement("div");
      notice.className = "console-line level-warn";
      notice.textContent = `Output truncated after ${MAX_CONSOLE_LINES} lines.`;
      consoleOutput.appendChild(notice);
    }
    return;
  }

  consoleLineCount += 1;

  const row = document.createElement("div");
  row.className = `console-line level-${level}`;

  const tag = document.createElement("span");
  tag.className = "console-tag";
  tag.textContent = level;

  const content = document.createElement("span");
  content.textContent = text;

  row.append(tag, content);
  consoleOutput.appendChild(row);
  consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

function setActiveTab(tabName) {
  const showConsole = tabName === "console";
  tabConsole.classList.toggle("is-active", showConsole);
  tabConsole.setAttribute("aria-selected", String(showConsole));
  tabTranspiled.classList.toggle("is-active", !showConsole);
  tabTranspiled.setAttribute("aria-selected", String(!showConsole));

  consoleOutput.classList.toggle("is-hidden", !showConsole);
  transpiledOutput.classList.toggle("is-hidden", showConsole);
}

function teardownSandbox() {
  if (timeoutHandle !== null) {
    clearTimeout(timeoutHandle);
    timeoutHandle = null;
  }
  if (activeSandbox) {
    activeSandbox.remove();
    activeSandbox = null;
  }
  activeRunId = null;
  btnStop.disabled = true;
  btnRun.disabled = !esbuildReady;
}

function generateRunId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function runCode() {
  if (!esbuildReady || !editor) return;

  teardownSandbox();
  clearConsole(false);
  setActiveTab("console");
  execMeta.textContent = "";
  setStatus("Transpiling...");

  const sourceCode = editor.getValue();
  let transpiledJs = "";

  try {
    const result = await esbuild.transform(sourceCode, {
      loader: currentMode,
      target: "es2022",
      format: "esm",
    });

    transpiledJs = result.code;
    transpiledCodeEl.textContent = transpiledJs || "// Empty output";

    for (const warning of result.warnings) {
      const loc = warning.location
        ? `Line ${warning.location.line}:${warning.location.column} — `
        : "";
      appendConsoleLine("warn", `${loc}${warning.text}`);
    }
  } catch (err) {
    setStatus("Transpile error", "error");
    appendConsoleLine("error", err?.message || String(err));
    return;
  }

  const runId = generateRunId();
  activeRunId = runId;
  btnRun.disabled = true;
  btnStop.disabled = false;
  setStatus("Running in sandbox...");

  const iframe = document.createElement("iframe");
  iframe.setAttribute("sandbox", "allow-scripts");
  iframe.src = "/js/sandbox.html";
  activeSandbox = iframe;

  // Store pending code on the iframe element for the sandbox-ready handshake
  iframe.dataset.runId = runId;
  iframe.dataset.pendingCode = transpiledJs;

  timeoutHandle = setTimeout(() => {
    if (activeRunId !== runId) return;
    appendConsoleLine(
      "error",
      `Execution timed out after ${EXECUTION_TIMEOUT_MS / 1000}s.`,
    );
    setStatus("Timed out", "error");
    teardownSandbox();
  }, EXECUTION_TIMEOUT_MS);

  sandboxHost.replaceChildren(iframe);
}

window.addEventListener("message", (event) => {
  if (!activeSandbox || event.source !== activeSandbox.contentWindow) {
    return;
  }

  const data = event.data;
  if (!data || typeof data !== "object") return;

  if (data.type === "sandbox-ready") {
    const runId = activeSandbox.dataset.runId;
    const code = activeSandbox.dataset.pendingCode ?? "";
    delete activeSandbox.dataset.pendingCode;

    activeSandbox.contentWindow.postMessage(
      { type: "execute", runId, code },
      "*",
    );
    return;
  }

  if (data.runId !== activeRunId) {
    return;
  }

  if (data.type === "clear") {
    clearConsole(false);
    return;
  }

  if (data.type === "console") {
    const allowedLevels = new Set(["log", "info", "warn", "error"]);
    const level = allowedLevels.has(data.level) ? data.level : "log";
    appendConsoleLine(level, String(data.text ?? ""));
    return;
  }

  if (data.type === "done") {
    const duration = typeof data.durationMs === "number" ? `${data.durationMs}ms` : "";
    if (consoleLineCount === 0) {
      appendConsoleLine("system", "Program exited with no console output.");
    }
    execMeta.textContent = duration ? `Finished in ${duration}` : "Finished";
    setStatus(data.failed ? "Runtime error" : "Ready (esbuild-wasm)", data.failed ? "error" : "ready");
    teardownSandbox();
  }
});

function updateEditorLanguage(mode) {
  currentMode = mode;
  langSelect.value = mode;
  if (editor && monacoRef) {
    const model = editor.getModel();
    if (model) {
      monacoRef.editor.setModelLanguage(
        model,
        mode === "ts" ? "typescript" : "javascript",
      );
    }
  }
  saveState();
}

async function initialize() {
  renderNavigation(navRoot, "js");
  langSelect.value = currentMode;
  bindExamplesMenu(exampleSelect, JS_TS_EXAMPLES, (example) => {
    if (!editor) return;
    if (example.mode === "js" || example.mode === "ts") {
      updateEditorLanguage(example.mode);
    }
    editor.setValue(example.code);
    saveState();
  });

  try {
    setStatus("Loading Monaco & esbuild-wasm...");

    const [monaco] = await Promise.all([
      loadMonaco(),
      esbuild.initialize({
        wasmURL: "/vendor/esbuild-wasm/esbuild.wasm",
        worker: true,
      }),
    ]);

    monacoRef = monaco;
    esbuildReady = true;

    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2022,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      allowNonTsExtensions: true,
      strict: true,
    });

    editor = monaco.editor.create(editorContainer, {
      value: loadSavedCode(currentMode),
      language: currentMode === "ts" ? "typescript" : "javascript",
      theme: "vs-dark",
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 14,
      tabSize: 2,
      scrollBeyondLastLine: false,
      padding: { top: 12 },
    });

    editor.onDidChangeModelContent(() => {
      saveState();
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      runCode();
    });

    btnRun.disabled = false;
    setStatus("Ready (esbuild-wasm)", "ready");
  } catch (err) {
    console.error("Failed to initialize playground:", err);
    setStatus("Engine failed to load", "error");
    appendConsoleLine("error", err?.message || String(err));
  }
}

btnRun.addEventListener("click", runCode);
btnStop.addEventListener("click", () => {
  appendConsoleLine("system", "Execution stopped by user.");
  setStatus("Stopped");
  teardownSandbox();
});
btnClear.addEventListener("click", () => {
  clearConsole(true);
  execMeta.textContent = "";
});
btnReset.addEventListener("click", () => {
  if (!editor) return;
  editor.setValue(DEFAULT_SNIPPETS[currentMode]);
  saveState();
});
langSelect.addEventListener("change", (event) => {
  const nextMode = event.target.value === "js" ? "js" : "ts";
  updateEditorLanguage(nextMode);
});
tabConsole.addEventListener("click", () => setActiveTab("console"));
tabTranspiled.addEventListener("click", () => setActiveTab("transpiled"));

initialize();
