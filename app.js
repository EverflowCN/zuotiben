const resources = [
  {
    title: "408 做题本",
    description: "计算机 408 复习、刷题与知识点整理。",
    category: "计算机",
    subject: "408",
    type: "做题本",
    updated: "2026-09-19",
    status: "待发布",
    url: ""
  },
  {
    title: "数学二做题本",
    description: "数学二刷题、复盘与错题整理。",
    category: "数学",
    subject: "数学二",
    type: "做题本",
    updated: "2026-09-19",
    status: "待发布",
    url: ""
  }
];

const state = {
  category: "全部",
  query: ""
};

const categoryNav = document.getElementById("categoryNav");
const list = document.getElementById("resourceList");
const count = document.getElementById("resourceCount");
const searchInput = document.getElementById("searchInput");
const currentCategory = document.getElementById("currentCategory");
const pageTitle = document.getElementById("pageTitle");
const emptyState = document.getElementById("emptyState");
const toast = document.getElementById("toast");

const categories = ["全部", ...Array.from(new Set(resources.map(item => item.category)))];

function esc(text) {
  return String(text ?? "").replace(/[&<>'"]/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[ch]));
}

function categoryCount(category) {
  return category === "全部"
    ? resources.length
    : resources.filter(item => item.category === category).length;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => toast.classList.remove("show"), 1400);
}

async function copyLink(url) {
  if (!url) {
    showToast("该资源尚未发布");
    return;
  }

  try {
    await navigator.clipboard.writeText(url);
    showToast("链接已复制");
  } catch {
    const ta = document.createElement("textarea");
    ta.value = url;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    showToast("链接已复制");
  }
}

function getFilteredResources() {
  const query = state.query.trim().toLowerCase();

  return resources
    .filter(item => state.category === "全部" || item.category === state.category)
    .filter(item => {
      if (!query) return true;
      return [
        item.title,
        item.description,
        item.category,
        item.subject,
        item.type
      ].join(" ").toLowerCase().includes(query);
    })
    .sort((a, b) => b.updated.localeCompare(a.updated));
}

function renderCategories() {
  categoryNav.innerHTML = categories.map(category => {
    const active = category === state.category ? " active" : "";
    return `
      <button class="category-item${active}" type="button" data-category="${esc(category)}">
        <span>${esc(category)}</span>
        <span class="category-count">${categoryCount(category)}</span>
      </button>
    `;
  }).join("");

  categoryNav.querySelectorAll(".category-item").forEach(button => {
    button.addEventListener("click", () => {
      state.category = button.dataset.category;
      currentCategory.textContent = state.category;
      pageTitle.textContent = state.category === "全部" ? "全部资料" : `${state.category}资料`;
      renderCategories();
      renderResources();
    });
  });
}

function renderResources() {
  const items = getFilteredResources();
  count.textContent = `${items.length} 项`;
  emptyState.hidden = items.length !== 0;

  list.innerHTML = items.map((item, index) => {
    const initial = item.subject.slice(0, 2);
    const openAction = item.url
      ? `<a class="action-link action-primary" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">打开资源 ↗</a>`
      : `<button class="action-link disabled" type="button" onclick="showToast('该资源尚未发布')">待发布</button>`;

    return `
      <article class="resource-item">
        <div class="resource-icon" aria-hidden="true">${esc(initial)}</div>

        <div class="resource-body">
          <div class="resource-title-line">
            <h2>${esc(item.title)}</h2>
            <span class="status">${esc(item.status)}</span>
          </div>

          <p class="resource-description">${esc(item.description)}</p>

          <div class="resource-tags">
            <span>${esc(item.category)}</span>
            <span>${esc(item.subject)}</span>
            <span>${esc(item.type)}</span>
          </div>
        </div>

        <div class="resource-side">
          <time datetime="${esc(item.updated)}">更新于 ${esc(item.updated)}</time>
          <div class="resource-actions">
            ${openAction}
            <button class="action-link" type="button" onclick="copyLink(resources[${resources.indexOf(item)}].url)">复制地址</button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

searchInput.addEventListener("input", event => {
  state.query = event.target.value;
  renderResources();
});

document.addEventListener("keydown", event => {
  if (
    event.key === "/" &&
    document.activeElement !== searchInput &&
    !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)
  ) {
    event.preventDefault();
    searchInput.focus();
  }

  if (event.key === "Escape" && document.activeElement === searchInput) {
    searchInput.value = "";
    state.query = "";
    searchInput.blur();
    renderResources();
  }
});

renderCategories();
renderResources();
