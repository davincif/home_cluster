export const JS_TS_EXAMPLES = [
  {
    group: "TypeScript",
    items: [
      {
        id: "ts-interfaces",
        label: "Interfaces & Top-Level Await",
        mode: "ts",
        code: `// TypeScript Playground — runs 100% in your browser via esbuild-wasm
interface Book {
  title: string;
  category: "fiction" | "tech";
  pages: number;
}

const library: Book[] = [
  { title: "Clean Architecture", category: "tech", pages: 432 },
  { title: "Dune", category: "fiction", pages: 688 },
  { title: "Designing Data-Intensive Applications", category: "tech", pages: 616 },
];

function summarize(books: Book[]): string {
  const totalPages = books.reduce((acc, book) => acc + book.pages, 0);
  return \`Library has \${books.length} books totaling \${totalPages} pages.\`;
}

console.log(summarize(library));
console.info("Catalog:", library);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
await delay(50);
console.log("Async execution finished!");
`,
      },
      {
        id: "ts-generics",
        label: "Generics & Discriminated Unions",
        mode: "ts",
        code: `// Type-safe Result<T, E> pattern with discriminated unions
type Result<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

function parsePercentage(raw: string): Result<number> {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    return { ok: false, error: \`Invalid percentage: "\${raw}"\` };
  }
  return { ok: true, value };
}

for (const input of ["42", "100", "150", "abc"]) {
  const res = parsePercentage(input);
  if (res.ok) {
    console.log(\`Valid percentage -> \${res.value}%\`);
  } else {
    console.warn(res.error);
  }
}
`,
      },
      {
        id: "ts-binary-search",
        label: "Algorithm: Generic Binary Search",
        mode: "ts",
        code: `// Generic binary search with custom comparator
function binarySearch<T>(
  sorted: readonly T[],
  target: T,
  compare: (a: T, b: T) => number,
): number {
  let low = 0;
  let high = sorted.length - 1;

  while (low <= high) {
    const mid = (low + high) >>> 1;
    const cmp = compare(sorted[mid], target);
    if (cmp === 0) return mid;
    if (cmp < 0) low = mid + 1;
    else high = mid - 1;
  }
  return -1;
}

const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31];
const cmpNum = (a: number, b: number) => a - b;

console.log("Index of 17:", binarySearch(primes, 17, cmpNum));
console.log("Index of 18:", binarySearch(primes, 18, cmpNum));
`,
      },
    ],
  },
  {
    group: "JavaScript",
    items: [
      {
        id: "js-pipelines",
        label: "Array Pipelines (map / filter / reduce)",
        mode: "js",
        code: `// Functional array transformations in JavaScript
const cart = [
  { item: "Coffee Beans", price: 18, inStock: true },
  { item: "Ceramic Mug", price: 12, inStock: true },
  { item: "French Press", price: 35, inStock: true },
  { item: "Travel Tumbler", price: 24, inStock: false },
];

const available = cart
  .filter((entry) => entry.inStock)
  .map((entry) => ({ ...entry, label: \`\${entry.item} ($\${entry.price})\` }));

const total = available.reduce((sum, entry) => sum + entry.price, 0);

console.log("Available:", available.map((entry) => entry.label));
console.info(\`Cart total: $\${total}\`);
`,
      },
      {
        id: "js-async",
        label: "Async/Await & Promise.all",
        mode: "js",
        code: `// Concurrent async tasks with timing
function simulateTask(name, ms) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(\`\${name} completed in \${ms}ms\`), ms);
  });
}

console.time("parallel-batch");
const results = await Promise.all([
  simulateTask("Fetch config", 40),
  simulateTask("Warm cache", 80),
  simulateTask("Check health", 25),
]);
console.timeEnd("parallel-batch");

for (const line of results) {
  console.log(line);
}
`,
      },
      {
        id: "js-memoize",
        label: "Closures & Memoization",
        mode: "js",
        code: `// Memoizing recursive Fibonacci with a Map closure
function memoize(fn) {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    if (!cache.has(key)) {
      cache.set(key, fn(...args));
    }
    return cache.get(key);
  };
}

const fib = memoize((n) => (n <= 1 ? n : fib(n - 1) + fib(n - 2)));

console.time("fib(40)");
console.log("fib(40) =", fib(40));
console.timeEnd("fib(40)");
console.log("First 10:", Array.from({ length: 10 }, (_, i) => fib(i)));
`,
      },
      {
        id: "js-classes",
        label: "Classes, Private Fields & Errors",
        mode: "js",
        code: `// ES2022 class with private fields and custom error handling
class RateLimitError extends Error {
  constructor(limit) {
    super(\`Rate limit exceeded (max \${limit} requests)\`);
    this.name = "RateLimitError";
  }
}

class TokenBucket {
  #tokens;
  #limit;

  constructor(limit) {
    this.#limit = limit;
    this.#tokens = limit;
  }

  consume(label) {
    if (this.#tokens <= 0) {
      throw new RateLimitError(this.#limit);
    }
    this.#tokens -= 1;
    console.log(\`Allowed "\${label}" (\${this.#tokens} remaining)\`);
  }
}

const bucket = new TokenBucket(3);
for (let i = 1; i <= 4; i++) {
  try {
    bucket.consume(\`req-\${i}\`);
  } catch (err) {
    console.error(err.name + ":", err.message);
  }
}
`,
      },
    ],
  },
];

export const DEFAULT_SNIPPETS = {
  ts: JS_TS_EXAMPLES[0].items[0].code,
  js: JS_TS_EXAMPLES[1].items[0].code,
};
