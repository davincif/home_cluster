/* global Go, importScripts */
"use strict";

importScripts("/go/wasm_exec.js");

let isReady = false;

self.__onGoWasmReady = () => {
  isReady = true;
  self.postMessage({ type: "ready" });
};

async function initWasm() {
  try {
    const go = new Go();
    let wasmResult;

    if (typeof WebAssembly.instantiateStreaming === "function") {
      try {
        wasmResult = await WebAssembly.instantiateStreaming(
          fetch("/go/yaegi.wasm"),
          go.importObject,
        );
      } catch {
        const response = await fetch("/go/yaegi.wasm");
        const bytes = await response.arrayBuffer();
        wasmResult = await WebAssembly.instantiate(bytes, go.importObject);
      }
    } else {
      const response = await fetch("/go/yaegi.wasm");
      const bytes = await response.arrayBuffer();
      wasmResult = await WebAssembly.instantiate(bytes, go.importObject);
    }

    // go.run() resolves only if main() exits; main() stays alive via select {}
    go.run(wasmResult.instance).catch((err) => {
      self.postMessage({
        type: "init-error",
        error: err?.message || String(err),
      });
    });
  } catch (err) {
    self.postMessage({
      type: "init-error",
      error: err?.message || String(err),
    });
  }
}

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "run") return;

  if (!isReady || typeof self.runGoCode !== "function") {
    self.postMessage({
      type: "result",
      runId: data.runId,
      stdout: "",
      stderr: "",
      error: "Go WASM runtime is not ready yet.",
      durationMs: 0,
    });
    return;
  }

  try {
    const output = self.runGoCode(String(data.code ?? ""));
    self.postMessage({
      type: "result",
      runId: data.runId,
      stdout: output?.stdout || "",
      stderr: output?.stderr || "",
      error: output?.error || "",
      durationMs: typeof output?.durationMs === "number" ? output.durationMs : 0,
    });
  } catch (err) {
    self.postMessage({
      type: "result",
      runId: data.runId,
      stdout: "",
      stderr: "",
      error: err?.message || String(err),
      durationMs: 0,
    });
  }
});

initWasm();
