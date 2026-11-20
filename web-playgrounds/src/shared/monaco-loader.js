let monacoLoadPromise = null;

/**
 * Loads the self-hosted Monaco Editor AMD loader from /vendor/monaco-editor/vs.
 * @returns {Promise<typeof import("monaco-editor")>}
 */
export function loadMonaco() {
  if (monacoLoadPromise) {
    return monacoLoadPromise;
  }

  monacoLoadPromise = new Promise((resolve, reject) => {
    const loaderScript = document.createElement("script");
    loaderScript.src = "/vendor/monaco-editor/vs/loader.js";
    loaderScript.async = true;

    loaderScript.onload = () => {
      if (typeof window.require !== "function") {
        reject(new Error("Monaco AMD loader failed to initialize."));
        return;
      }

      window.require.config({
        paths: { vs: "/vendor/monaco-editor/vs" },
      });

      window.require(
        ["vs/editor/editor.main"],
        () => {
          if (!window.monaco) {
            reject(new Error("window.monaco is unavailable after loading."));
            return;
          }
          resolve(window.monaco);
        },
        (err) => reject(err),
      );
    };

    loaderScript.onerror = () => {
      reject(new Error("Failed to load /vendor/monaco-editor/vs/loader.js"));
    };

    document.head.appendChild(loaderScript);
  });

  return monacoLoadPromise;
}
