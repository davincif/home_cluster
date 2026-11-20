/**
 * Populates a <select> element with flat or grouped code examples.
 *
 * @param {HTMLSelectElement} selectEl
 * @param {Array<{id: string, label: string, code: string, mode?: string} | {group: string, items: Array<{id: string, label: string, code: string, mode?: string}>}>} entries
 * @param {(example: {id: string, label: string, code: string, mode?: string}) => void} onSelect
 */
export function bindExamplesMenu(selectEl, entries, onSelect) {
  if (!selectEl) return;

  const lookup = new Map();
  selectEl.replaceChildren();

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Load example...";
  placeholder.selected = true;
  selectEl.appendChild(placeholder);

  for (const entry of entries) {
    if ("group" in entry && Array.isArray(entry.items)) {
      const optgroup = document.createElement("optgroup");
      optgroup.label = entry.group;

      for (const item of entry.items) {
        lookup.set(item.id, item);
        const option = document.createElement("option");
        option.value = item.id;
        option.textContent = item.label;
        optgroup.appendChild(option);
      }

      selectEl.appendChild(optgroup);
    } else if (entry && entry.id) {
      lookup.set(entry.id, entry);
      const option = document.createElement("option");
      option.value = entry.id;
      option.textContent = entry.label;
      selectEl.appendChild(option);
    }
  }

  selectEl.addEventListener("change", () => {
    const selected = lookup.get(selectEl.value);
    if (!selected) return;
    onSelect(selected);
    selectEl.value = "";
  });
}
