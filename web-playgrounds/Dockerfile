# Stage 1: Fetch self-hosted JS/TS playground assets (esbuild-wasm + monaco-editor)
FROM node:22-alpine AS js-assets
WORKDIR /build
RUN npm init -y && \
    npm install --no-audit --no-fund esbuild-wasm@0.25.0 monaco-editor@0.52.2

# Stage 2: Compile Yaegi Go interpreter to WebAssembly
FROM golang:1.22-alpine AS go-wasm-builder
WORKDIR /go-wasm
COPY go-wasm/go.mod ./
COPY go-wasm/main.go ./
RUN mkdir -p /out && \
    go mod tidy && \
    GOOS=js GOARCH=wasm go build -ldflags="-s -w" -o /out/yaegi.wasm . && \
    if [ -f /usr/local/go/lib/wasm/wasm_exec.js ]; then \
      cp /usr/local/go/lib/wasm/wasm_exec.js /out/wasm_exec.js; \
    else \
      cp /usr/local/go/misc/wasm/wasm_exec.js /out/wasm_exec.js; \
    fi

# Stage 3: Lightweight static Nginx server
FROM nginx:alpine

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY src/ /usr/share/nginx/html/

# Copy minimal JS/TS vendor artifacts
COPY --from=js-assets /build/node_modules/esbuild-wasm/esm/browser.min.js /usr/share/nginx/html/vendor/esbuild-wasm/esm/browser.min.js
COPY --from=js-assets /build/node_modules/esbuild-wasm/esbuild.wasm /usr/share/nginx/html/vendor/esbuild-wasm/esbuild.wasm
COPY --from=js-assets /build/node_modules/monaco-editor/min/vs/ /usr/share/nginx/html/vendor/monaco-editor/vs/

# Copy compiled Go Yaegi WASM artifacts
COPY --from=go-wasm-builder /out/yaegi.wasm /usr/share/nginx/html/go/yaegi.wasm
COPY --from=go-wasm-builder /out/wasm_exec.js /usr/share/nginx/html/go/wasm_exec.js

EXPOSE 80
