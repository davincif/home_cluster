# Web Playgrounds (`play.ldavincif.com`)

Self-hosted, 100% client-side code playgrounds served by a lightweight `nginx:alpine` container on `pi04`. All transpilation and execution run in the user's browser via WebAssembly and sandboxed iframes (0% server CPU overhead).

## Implemented Playgrounds

| Language        | Route      | Engine                            | Status  |
| :-------------- | :--------- | :-------------------------------- | :------ |
| JS / TypeScript | `/`        | `esbuild-wasm` + sandboxed iframe | Ready   |
| Go              | `/go/`     | Yaegi compiled to WASM (Worker)   | Ready   |
| Python          | `/python/` | JupyterLite (Pyodide)             | Planned |
| Java            | `/java/`   | CheerpJ                           | Planned |
| Lua             | `/lua/`    | Wasmoon                           | Planned |
| C               | `/c/`      | JSCPP / wasm-clang                | Planned |

## Build & Run

```sh
docker compose build && docker compose up -d
```

The service listens on port `8086` (`http://<IP_PI04>:8086`), avoiding port `8085` used by `plantuml-web`.
