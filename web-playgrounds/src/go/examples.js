export const GO_EXAMPLES = [
  {
    id: "go-structs",
    label: "Structs & Methods",
    code: `package main

import "fmt"

type Product struct {
	Name     string
	Category string
	Price    float64
}

func (p Product) Label() string {
	return fmt.Sprintf("%s [%s] - $%.2f", p.Name, p.Category, p.Price)
}

func main() {
	catalog := []Product{
		{Name: "Mechanical Keyboard", Category: "Hardware", Price: 129.90},
		{Name: "USB-C Cable", Category: "Accessory", Price: 14.50},
		{Name: "Desk Lamp", Category: "Office", Price: 39.00},
	}

	total := 0.0
	for _, item := range catalog {
		fmt.Println(item.Label())
		total += item.Price
	}
	fmt.Printf("\\nCatalog total: $%.2f\\n", total)
}
`,
  },
  {
    id: "go-goroutines",
    label: "Goroutines & Channels",
    code: `package main

import (
	"fmt"
	"sync"
)

func worker(id int, jobs <-chan int, results chan<- string, wg *sync.WaitGroup) {
	defer wg.Done()
	for job := range jobs {
		results <- fmt.Sprintf("worker %d processed job %d -> %d", id, job, job*job)
	}
}

func main() {
	jobs := make(chan int, 6)
	results := make(chan string, 6)
	var wg sync.WaitGroup

	for w := 1; w <= 3; w++ {
		wg.Add(1)
		go worker(w, jobs, results, &wg)
	}

	for j := 1; j <= 6; j++ {
		jobs <- j
	}
	close(jobs)

	wg.Wait()
	close(results)

	for msg := range results {
		fmt.Println(msg)
	}
}
`,
  },
  {
    id: "go-maps-sort",
    label: "Slices, Maps & Sorting",
    code: `package main

import (
	"fmt"
	"sort"
	"strings"
)

func main() {
	text := "go wasm yaegi browser go playground wasm go"
	counts := make(map[string]int)

	for _, word := range strings.Fields(text) {
		counts[word]++
	}

	type pair struct {
		Word  string
		Count int
	}

	var pairs []pair
	for k, v := range counts {
		pairs = append(pairs, pair{Word: k, Count: v})
	}

	sort.Slice(pairs, func(i, j int) bool {
		if pairs[i].Count == pairs[j].Count {
			return pairs[i].Word < pairs[j].Word
		}
		return pairs[i].Count > pairs[j].Count
	})

	fmt.Println("Word frequencies:")
	for _, p := range pairs {
		fmt.Printf("  %-12s %d\\n", p.Word, p.Count)
	}
}
`,
  },
  {
    id: "go-json",
    label: "JSON Marshal & Unmarshal",
    code: `package main

import (
	"encoding/json"
	"fmt"
)

type Task struct {
	Title    string \`json:"title"\`
	Priority int    \`json:"priority"\`
	Done     bool   \`json:"done"\`
}

func main() {
	task := Task{Title: "Write unit tests", Priority: 1, Done: false}

	encoded, err := json.MarshalIndent(task, "", "  ")
	if err != nil {
		fmt.Println("Marshal error:", err)
		return
	}
	fmt.Println("Encoded JSON:")
	fmt.Println(string(encoded))

	var decoded Task
	if err := json.Unmarshal(encoded, &decoded); err != nil {
		fmt.Println("Unmarshal error:", err)
		return
	}
	fmt.Printf("\\nDecoded struct: %+v\\n", decoded)
}
`,
  },
  {
    id: "go-interfaces",
    label: "Interfaces & Custom Errors",
    code: `package main

import (
	"errors"
	"fmt"
	"math"
)

type Shape interface {
	Area() float64
	Name() string
}

type Circle struct{ Radius float64 }

func (c Circle) Name() string  { return "Circle" }
func (c Circle) Area() float64 { return math.Pi * c.Radius * c.Radius }

type Rectangle struct{ Width, Height float64 }

func (r Rectangle) Name() string  { return "Rectangle" }
func (r Rectangle) Area() float64 { return r.Width * r.Height }

func safeDivide(a, b float64) (float64, error) {
	if b == 0 {
		return 0, errors.New("division by zero")
	}
	return a / b, nil
}

func main() {
	shapes := []Shape{
		Circle{Radius: 5},
		Rectangle{Width: 4, Height: 6},
	}

	for _, s := range shapes {
		fmt.Printf("%s area = %.2f\\n", s.Name(), s.Area())
	}

	if _, err := safeDivide(10, 0); err != nil {
		fmt.Println("Expected error:", err)
	}
}
`,
  },
];

export const DEFAULT_GO_CODE = GO_EXAMPLES[0].code;
