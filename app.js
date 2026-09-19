const catalog = [
  { name: "公共课", subjects: ["政治", "英语一", "英语二", "数学一", "数学二", "数学三"] },
  { name: "计算机", subjects: ["408", "计算机自命题"] },
  { name: "经管联考", subjects: ["199管理类联考", "396经济类联考", "经济学专业课", "金融专业课"] },
  { name: "法学", subjects: ["法律硕士", "法学专业课"] },
  { name: "教育·心理", subjects: ["教育学", "教育综合", "心理学"] },
  { name: "医学", subjects: ["西医相关", "中医相关", "护理", "药学"] },
  { name: "理工", subjects: ["机械", "电气", "电子信息", "自动化", "土木", "材料", "化工", "环境", "建筑"] },
  { name: "农学", subjects: ["农学", "林学", "食品", "兽医"] },
  { name: "人文社科", subjects: ["中文", "历史", "哲学", "新闻传播", "社会学", "公共管理"] },
  { name: "艺术·体育", subjects: ["艺术", "设计", "体育"] },
  { name: "其他", subjects: ["自命题专业课", "其他"] }
];

const workbookTypes = ["全部类型", "综合", "真题", "章节", "强化", "错题", "模拟", "冲刺"];

const resources = [
  {
    title: "408 做题本",
    description: "计算机 408 复习、刷题与知识点整理。",
    category: "计算机",
    subject: "408",
    type: "综合",
    updated: "2026-09-19",
    status: "待发布",
    url: ""
  },
  {
    title: "数学二做题本",
    description: "数学二刷题、复盘与错题整理。",
    category: "公共课",
    subject: "数学二",
    type: "综合",
    updated: "2026-09-19",
    status: "待发布",
    url: ""
  }
];

const state = {
  category: "全部",
  subject: "全部科目",
  type: "全部类型",
  query: ""
};

const categoryNav = document.getElementById("categoryNav");
const subjectNav = document.getElementById("subjectNav");
const typeNav = document.getElementById("typeNav");
const list = document.getElementById("resourceList");
const count = document.getElementById("resourceCount");
const searchInput = document.getElementById("searchInput");
const currentCategory = document.getElementById("currentCategory");
const currentSubject = document.getElementById("currentSubject");
const currentType = document.getElementById("currentType");
const pageTitle = document.getElementById("pageTitle");
const emptyState = document.getElementById("emptyState");
const toast = document.getElementById("toast");

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
  if (category === "全部") return resources.length;
  return resources.filter(item => item.category === category).length;
}

function subjectCount(subject) {
  return resources.filter(item => {
    const categoryMatch = state.category === "全部" || item.category === state.category;
    const subjectMatch = subject === "全部科目" || item.subject === subject;
    return categoryMatch && subjectMatch;
  }).length;
}

function getSubjects() {
  if (state.category === "全部") {
    return ["全部科目", ...Array.from(new Set(catalog.flatMap(group => group.subjects)))];
  }

  const group = catalog.find(item => item.name === state.category);
  return ["全部科目", ...(group?.subjects || [])];
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
    .filter(item => state.subject === "全部科目" || item.subject === state.subject)
    .filter(item => state.type === "全部类型" || item.type === state.type)
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

function updateHeadings() {
  currentCategory.textContent = state.category;
  currentSubject.textContent = state.subject;
  currentType.textContent = state.type;

  if (state.subject !== "全部科目") {
    pageTitle.textContent = `${state.subject}做题本`;
  } else if (state.category !== "全部") {
    pageTitle.textContent = `${state.category}做题本`;
  } else {
    pageTitle.textContent = "全部做题本";
  }
}

function renderCategories() {
  const categories = ["全部", ...catalog.map(item => item.name)];

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
      state.subject = "全部科目";
      updateHeadings();
      renderCategories();
      renderSubjects();
      renderResources();
    });
  });
}

function renderSubjects() {
  const subjects = getSubjects();

  subjectNav.innerHTML = subjects.map(subject => {
    const active = subject === state.subject ? " active" : "";
    return `
      <button class="filter-chip${active}" type="button" data-subject="${esc(subject)}">
        <span>${esc(subject)}</span>
        <small>${subjectCount(subject)}</small>
      </button>
    `;
  }).join("");

  subjectNav.querySelectorAll(".filter-chip").forEach(button => {
    button.addEventListener("click", () => {
      state.subject = button.dataset.subject;
      updateHeadings();
      renderSubjects();
      renderResources();
    });
  });
}

function renderTypes() {
  typeNav.innerHTML = workbookTypes.map(type => {
    const active = type === state.type ? " active" : "";
    return `
      <button class="filter-chip${active}" type="button" data-type="${esc(type)}">
        ${esc(type)}
      </button>
    `;
  }).join("");

  typeNav.querySelectorAll(".filter-chip").forEach(button => {
    button.addEventListener("click", () => {
      state.type = button.dataset.type;
      updateHeadings();
      renderTypes();
      renderResources();
    });
  });
}

function renderResources() {
  const items = getFilteredResources();
  count.textContent = `${items.length} 项已收录`;
  emptyState.hidden = items.length !== 0;

  list.innerHTML = items.map(item => {
    const initial = item.subject.slice(0, 2);
    const sourceIndex = resources.indexOf(item);
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
            <button class="action-link" type="button" onclick="copyLink(resources[${sourceIndex}].url)">复制地址</button>
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

updateHeadings();
renderCategories();
renderSubjects();
renderTypes();
renderResources();
