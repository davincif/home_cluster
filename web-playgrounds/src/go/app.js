import { renderNavigation } from "/shared/nav.js";
import { loadMonaco } from "/shared/monaco-loader.js";
import { bindExamplesMenu } from "/shared/examples-menu.js";
import { GO_EXAMPLES, DEFAULT_GO_CODE } from "/go/examples.js";

const STORAGE_CODE_KEY = "web_playgrounds_go_code";
const EXECUTION_TIMEOUT_MS = 10000;

const navRoot = document.getElementById("nav-root");
const editorContainer = document.getElementById("editor-container");
const exampleSelect = document.getElementById("example-select");
const btnRun = document.getElementById("btn-run");
const btnStop = document.getElementById("btn-stop");
const btnReset = document.getElementById("btn-reset");
const btnClear = document.getElementById("btn-clear");
const statusText = document.getElementById("status-text");
const execMeta = document.getElementById("exec-meta");
const consoleOutput = document.getElementById("console-output");

let editor = null;
let worker = null;
let workerReady = false;
let activeRunId = null;
let timeoutHandle = null;

function loadSavedCode() {
  try {
    const saved = localStorage.getItem(STORAGE_CODE_KEY);
    if (saved !== null && saved.trim().length > 0) {
      return saved;
    }
  } catch {
    // Ignore storage errors
  }
  return DEFAULT_GO_CODE;
}

function saveCode() {
  if (!editor) return;
  try {
    localStorage.setItem(STORAGE_CODE_KEY, editor.getValue());
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

function clearOutput(showPlaceholder = false) {
  if (showPlaceholder) {
    const placeholder = document.createElement("div");
    placeholder.className = "console-empty";
    placeholder.textContent = "Output cleared.";
    consoleOutput.replaceChildren(placeholder);
    return;
  }
  consoleOutput.replaceChildren();
}

function appendOutputBlock(level, tagLabel, text) {
  const row = document.createElement("div");
  row.className = `console-line level-${level}`;

  const tag = document.createElement("span");
  tag.className = "console-tag";
  tag.textContent = tagLabel;

  const content = document.createElement("span");
  content.textContent = text;

  row.append(tag, content);
  consoleOutput.appendChild(row);
  consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

function generateRunId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function finishRunState() {
  if (timeoutHandle !== null) {
    clearTimeout(timeoutHandle);
    timeoutHandle = null;
  }
  activeRunId = null;
  btnStop.disabled = true;
  btnRun.disabled = !(workerReady && editor);
}

function spawnWorker() {
  if (worker) {
    worker.terminate();
    worker = null;
  }

  workerReady = false;
  btnRun.disabled = true;
  setStatus("Loading Yaegi WASM...");

  const nextWorker = new Worker("/go/go-worker.js");
  worker = nextWorker;

  nextWorker.addEventListener("message", (event) => {
    if (worker !== nextWorker) return;
    const data = event.data;
    if (!data || typeof data !== "object") return;

    if (data.type === "ready") {
      workerReady = true;
      btnRun.disabled = !editor;
      setStatus("Ready (Yaegi WASM)", "ready");
      return;
    }

    if (data.type === "init-error") {
      workerReady = false;
      setStatus("WASM failed to load", "error");
      clearOutput(false);
      appendOutputBlock("error", "init", data.error || "Failed to initialize Yaegi WASM.");
      return;
    }

    if (data.type === "result" && data.runId === activeRunId) {
      clearOutput(false);

      const hasStdout = Boolean(data.stdout && data.stdout.length > 0);
      const hasStderr = Boolean(data.stderr && data.stderr.length > 0);
      const hasError = Boolean(data.error && data.error.length > 0);

      if (hasStdout) {
        appendOutputBlock("log", "stdout", data.stdout.replace(/\n$/, ""));
      }
      if (hasStderr) {
        appendOutputBlock("warn", "stderr", data.stderr.replace(/\n$/, ""));
      }
      if (hasError) {
        appendOutputBlock("error", "error", data.error);
      }
      if (!hasStdout && !hasStderr && !hasError) {
        appendOutputBlock("system", "info", "Program exited with no output.");
      }

      execMeta.textContent =
        typeof data.durationMs === "number" ? `Finished in ${data.durationMs}ms` : "Finished";
      setStatus(hasError ? "Execution error" : "Ready (Yaegi WASM)", hasError ? "error" : "ready");
      finishRunState();
    }
  });

  nextWorker.addEventListener("error", (event) => {
    if (worker !== nextWorker) return;
    setStatus("Worker error", "error");
    appendOutputBlock("error", "worker", event.message || "Unexpected Go worker failure.");
    finishRunState();
  });
}

function runCode() {
  if (!workerReady || !worker || !editor) return;

  clearOutput(false);
  execMeta.textContent = "";

  const runId = generateRunId();
  activeRunId = runId;
  btnRun.disabled = true;
  btnStop.disabled = false;
  setStatus("Running Go code...");

  timeoutHandle = setTimeout(() => {
    if (activeRunId !== runId) return;
    appendOutputBlock(
      "error",
      "timeout",
      `Execution timed out after ${EXECUTION_TIMEOUT_MS / 1000}s. Restarting Go runtime...`,
    );
    finishRunState();
    spawnWorker();
  }, EXECUTION_TIMEOUT_MS);

  worker.postMessage({
    type: "run",
    runId,
    code: editor.getValue(),
  });
}

async function initialize() {
  renderNavigation(navRoot, "go");
  bindExamplesMenu(exampleSelect, GO_EXAMPLES, (example) => {
    if (!editor) return;
    editor.setValue(example.code);
    saveCode();
  });

  spawnWorker();

  try {
    const monaco = await loadMonaco();

    editor = monaco.editor.create(editorContainer, {
      value: loadSavedCode(),
      language: "go",
      theme: "vs-dark",
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 14,
      tabSize: 4,
      insertSpaces: false,
      scrollBeyondLastLine: false,
      padding: { top: 12 },
    });

    editor.onDidChangeModelContent(() => {
      saveCode();
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      runCode();
    });

    btnRun.disabled = !workerReady;
  } catch (err) {
    console.error("Failed to load Monaco Editor:", err);
    setStatus("Editor failed to load", "error");
    appendOutputBlock("error", "init", err?.message || String(err));
  }
}

btnRun.addEventListener("click", runCode);
btnStop.addEventListener("click", () => {
  appendOutputBlock("system", "stop", "Execution stopped by user. Restarting Go runtime...");
  finishRunState();
  spawnWorker();
});
btnClear.addEventListener("click", () => {
  clearOutput(true);
  execMeta.textContent = "";
});
btnReset.addEventListener("click", () => {
  if (!editor) return;
  editor.setValue(DEFAULT_GO_CODE);
  saveCode();
});

initialize();
