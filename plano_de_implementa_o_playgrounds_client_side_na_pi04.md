# Plano de Implementação: Playgrounds Client-Side (`pi04`)

Servidor estático único (`nginx:alpine`) em `play.ldavincif.com` rodando 100% no navegador via WebAssembly/JS.

---

## 1. Motores Client-Side por Linguagem

| Linguagem           | Rota       | Motor WASM / JS                                                         | Artefatos Estáticos                             |
| :------------------ | :--------- | :---------------------------------------------------------------------- | :---------------------------------------------- |
| **JS / TypeScript** | `/`        | `esbuild-wasm` + `iframe` sandbox                                       | `index.html`                                    |
| **Go**              | `/go/`     | **Yaegi** compilado em WASM                                             | `index.html`, `yaegi.wasm`, `wasm_exec.js`      |
| **Python**          | `/python/` | **JupyterLite** (Pyodide)                                               | Build gerado via `jupyter lite build`           |
| **Java**            | `/java/`   | **CheerpJ** (JVM completa em WebAssembly)                               | `index.html` + loader CheerpJ                   |
| **Lua**             | `/lua/`    | **Wasmoon** (Lua 5.4 em WASM)                                           | `index.html` (carrega via CDN ou bundle local)  |
| **C**               | `/c/`      | **JSCPP** (interpretador C em JS) ou **Clang/LLVM WASM** (`wasm-clang`) | `index.html` + `jscpp.js` (ou binários `.wasm`) |

---

## 2. Estrutura de Arquivos do Repositório (`web-playgrounds`)

```text
web-playgrounds/
├── .gitea/workflows/deploy.yml   # Build ARM64 e deploy via SSH na pi04
├── Dockerfile                    # Multi-stage: compila WASMs + JupyterLite -> nginx:alpine
├── docker-compose.yml            # Container na pi04 (porta 8085, limite 64MB RAM)
├── nginx/
│   └── default.conf              # Headers COOP/COEP e MIME application/wasm
├── go-wasm/
│   └── main.go                   # Wrapper Yaegi expondo runGoCode() via syscall/js
└── src/
    ├── index.html                # Hub + Playground JS/TS (Monaco Editor)
    ├── go/index.html             # UI Go + loader wasm_exec.js
    ├── lua/index.html            # UI Lua + Wasmoon
    ├── c/index.html              # UI C + JSCPP / wasm-clang
    └── java/index.html           # UI Java + CheerpJ (javac + java no browser)
```

---

## 3. Arquivos a Implementar

### A. `go-wasm/main.go` (Interpretador Go)

- Criar wrapper usando `github.com/traefik/yaegi/interp` e `syscall/js`.
- Redirecionar `os.Stdout` / `os.Stderr` para um buffer e retornar a string executada para o JS.

### B. `src/*/index.html` (Interfaces)

- **Barra de navegação compartilhada** entre `/`, `/python/`, `/go/`, `/lua/`, `/c/` e `/java/`.
- **Monaco Editor** em todas as abas + botão "Run" + painel de `stdout`.
- **JS/TS (`src/index.html`):** Transpila com `esbuild-wasm` e executa em `<iframe sandbox="allow-scripts">`.
- **Lua (`src/lua/index.html`):** Instancia `LuaFactory` do `wasmoon` e executa `lua.doString(code)`.
- **C (`src/c/index.html`):** Executa via `JSCPP.run(code, input)` (leve, ~200KB, ideal para algoritmos) ou `wasm-clang` (compilação real).
- **Java (`src/java/index.html`):** Inicializa `cheerpjInit()`, grava `Main.java` no filesystem virtual (`/str/Main.java`), compila com `cheerpjRunMain("com.sun.tools.javac.Main", ...)` e executa a classe.

### C. `nginx/default.conf`

- Configurar `types { application/wasm wasm; }`.
- Adicionar headers obrigatórios para `SharedArrayBuffer` / Workers (Pyodide, CheerpJ, Clang):
  ```nginx
  add_header Cross-Origin-Opener-Policy "same-origin" always;
  add_header Cross-Origin-Embedder-Policy "require-corp" always;
  ```
- Configurar `expires 30d;` para `.wasm`, `.data`, `.whl` e `.jar`.

### D. `Dockerfile` (Multi-stage)

1. **Stage 1 (`golang:alpine`):** Compila `go-wasm/main.go` com `GOOS=js GOARCH=wasm` -> gera `yaegi.wasm` e copia `wasm_exec.js`.
2. **Stage 2 (`python:slim`):** Instala `jupyterlite-core` + `jupyterlite-pyodide-kernel` e roda `jupyter lite build --output-dir /out/python`.
3. **Stage 3 (`nginx:alpine`):** Copia `nginx/default.conf`, `src/`, artefatos do Stage 1 (`/go/`) e artefatos do Stage 2 (`/python/`).

### E. `docker-compose.yml` & `.gitea/workflows/deploy.yml`

- **Compose (`pi04`):** Imagem `nginx:alpine` customizada, porta `8085:80`, `mem_limit: 64m`, `restart: unless-stopped`.
- **Gitea Workflow:** `docker buildx build --platform linux/arm64`, transfere imagem via SSH para `pi04` e roda `docker compose up -d`.
- **Cloudflare Tunnel:** Apontar `play.ldavincif.com` -> `http://<IP_PI04>:8085`.
