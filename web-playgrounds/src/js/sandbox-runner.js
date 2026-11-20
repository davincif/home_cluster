(() => {
  "use strict";

  const MAX_DEPTH = 6;
  const MAX_STRING_LENGTH = 8192;
  const timers = new Map();

  let activeRunId = null;

  function formatValue(value, depth = 0, seen = new WeakSet()) {
    if (value === null) return "null";
    if (value === undefined) return "undefined";

    const valueType = typeof value;
    if (valueType === "string") {
      if (value.length > MAX_STRING_LENGTH) {
        return `${value.slice(0, MAX_STRING_LENGTH)}... [truncated]`;
      }
      return depth === 0 ? value : JSON.stringify(value);
    }
    if (valueType === "number" || valueType === "boolean") {
      return String(value);
    }
    if (valueType === "bigint") {
      return `${value}n`;
    }
    if (valueType === "symbol") {
      return value.toString();
    }
    if (valueType === "function") {
      return `[Function: ${value.name || "anonymous"}]`;
    }

    if (value instanceof Error) {
      return value.stack || `${value.name}: ${value.message}`;
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (value instanceof RegExp) {
      return value.toString();
    }

    if (depth >= MAX_DEPTH) {
      return Array.isArray(value) ? "[Array]" : "[Object]";
    }

    if (seen.has(value)) {
      return "[Circular]";
    }
    seen.add(value);

    if (value instanceof Map) {
      const entries = [...value.entries()].map(
        ([k, v]) => `${formatValue(k, depth + 1, seen)} => ${formatValue(v, depth + 1, seen)}`,
      );
      return `Map(${value.size}) { ${entries.join(", ")} }`;
    }

    if (value instanceof Set) {
      const items = [...value.values()].map((v) => formatValue(v, depth + 1, seen));
      return `Set(${value.size}) { ${items.join(", ")} }`;
    }

    if (Array.isArray(value)) {
      const items = value.map((item) => formatValue(item, depth + 1, seen));
      return `[${items.join(", ")}]`;
    }

    try {
      const keys = Object.keys(value);
      const pairs = keys.map(
        (key) => `${key}: ${formatValue(value[key], depth + 1, seen)}`,
      );
      return `{ ${pairs.join(", ")} }`;
    } catch {
      return Object.prototype.toString.call(value);
    }
  }

  function postToHost(payload) {
    window.parent.postMessage({ ...payload, runId: activeRunId }, "*");
  }

  function emitConsole(level, args) {
    const text = args.map((arg) => formatValue(arg, 0)).join(" ");
    postToHost({ type: "console", level, text });
  }

  // Override console methods to stream output back to the host UI
  console.log = (...args) => emitConsole("log", args);
  console.info = (...args) => emitConsole("info", args);
  console.warn = (...args) => emitConsole("warn", args);
  console.error = (...args) => emitConsole("error", args);
  console.debug = (...args) => emitConsole("log", args);
  console.clear = () => postToHost({ type: "clear" });
  console.table = (data) => emitConsole("log", [data]);
  console.time = (label = "default") => {
    timers.set(String(label), performance.now());
  };
  console.timeEnd = (label = "default") => {
    const key = String(label);
    const start = timers.get(key);
    if (start === undefined) {
      emitConsole("warn", [`Timer '${key}' does not exist`]);
      return;
    }
    timers.delete(key);
    emitConsole("info", [`${key}: ${(performance.now() - start).toFixed(2)}ms`]);
  };

  window.addEventListener("error", (event) => {
    const message = event.error
      ? formatValue(event.error, 0)
      : event.message || "Uncaught runtime error";
    postToHost({ type: "console", level: "error", text: message });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = formatValue(event.reason, 0);
    postToHost({
      type: "console",
      level: "error",
      text: `Unhandled Promise Rejection: ${reason}`,
    });
  });

  window.addEventListener("message", async (event) => {
    if (event.source !== window.parent) return;
    const data = event.data;
    if (!data || data.type !== "execute" || typeof data.code !== "string") {
      return;
    }

    activeRunId = data.runId;
    const startedAt = performance.now();

    const blob = new Blob([data.code], { type: "application/javascript" });
    const moduleUrl = URL.createObjectURL(blob);

    try {
      await import(moduleUrl);
      const durationMs = Math.round(performance.now() - startedAt);
      postToHost({ type: "done", durationMs });
    } catch (err) {
      const durationMs = Math.round(performance.now() - startedAt);
      postToHost({
        type: "console",
        level: "error",
        text: formatValue(err, 0),
      });
      postToHost({ type: "done", durationMs, failed: true });
    } finally {
      URL.revokeObjectURL(moduleUrl);
    }
  });

  window.parent.postMessage({ type: "sandbox-ready" }, "*");
})();
