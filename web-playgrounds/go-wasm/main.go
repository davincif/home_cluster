//go:build js && wasm

package main

import (
	"bytes"
	"fmt"
	"syscall/js"
	"time"

	"github.com/traefik/yaegi/interp"
	"github.com/traefik/yaegi/stdlib"
)

const maxOutputBytes = 512 * 1024 // 512 KB cap per stream to prevent browser OOM

type limitedBuffer struct {
	buf       bytes.Buffer
	limit     int
	truncated bool
}

func (l *limitedBuffer) Write(p []byte) (int, error) {
	remaining := l.limit - l.buf.Len()
	if remaining <= 0 {
		l.truncated = true
		return len(p), nil
	}
	if len(p) > remaining {
		l.buf.Write(p[:remaining])
		l.truncated = true
		return len(p), nil
	}
	return l.buf.Write(p)
}

func (l *limitedBuffer) String() string {
	if l.truncated {
		return l.buf.String() + "\n... [output truncated at 512KB]"
	}
	return l.buf.String()
}

func runGoCode(_ js.Value, args []js.Value) any {
	result := map[string]any{
		"stdout":     "",
		"stderr":     "",
		"error":      "",
		"durationMs": int64(0),
	}

	if len(args) < 1 || args[0].Type() != js.TypeString {
		result["error"] = "Expected Go source code string as first argument."
		return result
	}

	code := args[0].String()
	stdout := &limitedBuffer{limit: maxOutputBytes}
	stderr := &limitedBuffer{limit: maxOutputBytes}
	start := time.Now()

	func() {
		defer func() {
			if r := recover(); r != nil {
				result["error"] = fmt.Sprintf("panic: %v", r)
			}
		}()

		interpreter := interp.New(interp.Options{
			Stdout: stdout,
			Stderr: stderr,
		})

		if err := interpreter.Use(stdlib.Symbols); err != nil {
			result["error"] = fmt.Sprintf("failed to load Go stdlib: %v", err)
			return
		}

		if _, err := interpreter.Eval(code); err != nil {
			result["error"] = err.Error()
		}
	}()

	result["stdout"] = stdout.String()
	result["stderr"] = stderr.String()
	result["durationMs"] = time.Since(start).Milliseconds()
	return result
}

func main() {
	js.Global().Set("runGoCode", js.FuncOf(runGoCode))

	onReady := js.Global().Get("__onGoWasmReady")
	if onReady.Type() == js.TypeFunction {
		onReady.Invoke()
	}

	// Keep the Go WASM runtime alive for subsequent evaluations
	select {}
}
