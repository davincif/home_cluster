const PLAYGROUNDS = [
  { id: "js", label: "JS / TS", href: "/", enabled: true },
  { id: "go", label: "Go", href: "/go/", enabled: true },
  { id: "python", label: "Python", href: "/python/", enabled: false },
  { id: "java", label: "Java", href: "/java/", enabled: false },
  { id: "lua", label: "Lua", href: "/lua/", enabled: false },
  { id: "c", label: "C", href: "/c/", enabled: false },
];

/**
 * Renders the shared top navigation bar across all playgrounds.
 * @param {HTMLElement} container
 * @param {string} activeId
 */
export function renderNavigation(container, activeId) {
  if (!container) return;

  const nav = document.createElement("nav");
  nav.className = "top-nav";
  nav.setAttribute("aria-label", "Playground navigation");

  const brand = document.createElement("a");
  brand.className = "nav-brand";
  brand.href = "/";

  const dot = document.createElement("span");
  dot.className = "nav-brand-dot";
  dot.setAttribute("aria-hidden", "true");

  const brandText = document.createElement("span");
  brandText.textContent = "Web Playgrounds";

  brand.append(dot, brandText);

  const links = document.createElement("div");
  links.className = "nav-links";

  for (const item of PLAYGROUNDS) {
    const link = document.createElement(item.enabled ? "a" : "span");
    link.className = "nav-link";

    if (item.id === activeId) {
      link.classList.add("is-active");
      link.setAttribute("aria-current", "page");
    }

    if (item.enabled) {
      link.href = item.href;
    } else {
      link.classList.add("is-disabled");
      link.title = `${item.label} playground coming soon`;
    }

    const label = document.createElement("span");
    label.textContent = item.label;
    link.appendChild(label);

    if (!item.enabled) {
      const badge = document.createElement("span");
      badge.className = "nav-badge";
      badge.textContent = "Soon";
      link.appendChild(badge);
    }

    links.appendChild(link);
  }

  nav.append(brand, links);
  container.replaceChildren(nav);
}
