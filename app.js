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

const resourceTypes = ["全部资源", "书籍", "讲义", "做题本", "真题", "题库", "笔记", "模拟卷", "冲刺资料", "其他"];

const resources = [
  {
    id: "408-workbook",
    title: "408 做题本",
    description: "计算机 408 复习、刷题与知识点整理。",
    category: "计算机",
    subject: "408",
    resourceType: "做题本",
    updated: "2026-09-19",
    status: "整理中",
    versions: [
      {
        name: "标准版",
        meta: ["PDF", "适合平板", "普通打印"],
        note: "常规阅读与书写版本。",
        channels: [
          { label: "百度网盘", url: "", code: "", note: "待添加" },
          { label: "夸克网盘", url: "", code: "", note: "待添加" },
          { label: "直链下载", url: "", code: "", note: "待添加" }
        ]
      },
      {
        name: "打印专版",
        meta: ["A4", "双面印刷", "留空白页"],
        note: "针对双面打印重新安排分页，需要的位置保留空白页。",
        channels: [
          { label: "下载打印版", url: "", code: "", note: "待添加" },
          { label: "在线打印", url: "", code: "", note: "待添加" }
        ]
      }
    ]
  },
  {
    id: "math2-workbook",
    title: "数学二做题本",
    description: "数学二刷题、复盘与错题整理。",
    category: "公共课",
    subject: "数学二",
    resourceType: "做题本",
    updated: "2026-09-19",
    status: "整理中",
    versions: [
      {
        name: "标准版",
        meta: ["PDF", "通用"],
        note: "适合平板阅读、书写与常规打印。",
        channels: [
          { label: "百度网盘", url: "", code: "", note: "待添加" },
          { label: "夸克网盘", url: "", code: "", note: "待添加" }
        ]
      },
      {
        name: "打印专版",
        meta: ["A4", "双面印刷", "留空白页"],
        note: "针对纸质双面打印优化分页与留白。",
        channels: [
          { label: "下载打印版", url: "", code: "", note: "待添加" },
          { label: "在线打印", url: "", code: "", note: "待添加" }
        ]
      }
    ]
  }
];

const state = {
  category: "全部",
  subject: "全部科目",
  resourceType: "全部资源",
  query: ""
};

const categoryNav = document.getElementById("categoryNav");
const subjectNav = document.getElementById("subjectNav");
const resourceTypeNav = document.getElementById("resourceTypeNav");
const list = document.getElementById("resourceList");
const count = document.getElementById("resourceCount");
const searchInput = document.getElementById("searchInput");
const currentCategory = document.getElementById("currentCategory");
const currentSubject = document.getElementById("currentSubject");
const currentResourceType = document.getElementById("currentResourceType");
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

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => toast.classList.remove("show"), 1500);
}

function categoryCount(category) {
  if (category === "全部") return resources.length;
  return resources.filter(item => item.category === category).length;
}

function getSubjects() {
  if (state.category === "全部") {
    return ["全部科目", ...Array.from(new Set(catalog.flatMap(group => group.subjects)))];
  }
  const group = catalog.find(item => item.name === state.category);
  return ["全部科目", ...(group?.subjects || [])];
}

function subjectCount(subject) {
  return resources.filter(item => {
    const categoryMatch = state.category === "全部" || item.category === state.category;
    const subjectMatch = subject === "全部科目" || item.subject === subject;
    return categoryMatch && subjectMatch;
  }).length;
}

function typeCount(type) {
  return resources.filter(item => {
    const categoryMatch = state.category === "全部" || item.category === state.category;
    const subjectMatch = state.subject === "全部科目" || item.subject === state.subject;
    const typeMatch = type === "全部资源" || item.resourceType === type;
    return categoryMatch && subjectMatch && typeMatch;
  }).length;
}

function updateHeadings() {
  currentCategory.textContent = state.category;
  currentSubject.textContent = state.subject;
  currentResourceType.textContent = state.resourceType;

  if (state.subject !== "全部科目") {
    pageTitle.textContent = `${state.subject}资源`;
  } else if (state.category !== "全部") {
    pageTitle.textContent = `${state.category}资源`;
  } else if (state.resourceType !== "全部资源") {
    pageTitle.textContent = state.resourceType;
  } else {
    pageTitle.textContent = "全部资源";
  }
}

function searchableText(item) {
  const versionText = item.versions.flatMap(version => [
    version.name,
    version.note,
    ...version.meta,
    ...version.channels.flatMap(channel => [
      channel.label,
      channel.note,
      channel.code
    ])
  ]).join(" ");

  return [
    item.title,
    item.description,
    item.category,
    item.subject,
    item.resourceType,
    item.status,
    versionText
  ].join(" ").toLowerCase();
}

function getFilteredResources() {
  const query = state.query.trim().toLowerCase();

  return resources
    .filter(item => state.category === "全部" || item.category === state.category)
    .filter(item => state.subject === "全部科目" || item.subject === state.subject)
    .filter(item => state.resourceType === "全部资源" || item.resourceType === state.resourceType)
    .filter(item => !query || searchableText(item).includes(query))
    .sort((a, b) => b.updated.localeCompare(a.updated));
}

function copyText(text, message = "已复制") {
  if (!text) {
    showToast("暂无可复制内容");
    return;
  }

  navigator.clipboard?.writeText(text)
    .then(() => showToast(message))
    .catch(() => {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      showToast(message);
    });
}

function channelCopyText(channel) {
  if (!channel.url) return "";
  return channel.code
    ? `${channel.url}\n提取码：${channel.code}`
    : channel.url;
}

function openChannel(resourceIndex, versionIndex, channelIndex) {
  const channel = resources[resourceIndex]?.versions[versionIndex]?.channels[channelIndex];
  if (!channel?.url) {
    showToast("该入口尚未添加");
    return;
  }
  window.open(channel.url, "_blank", "noopener,noreferrer");
}

function copyChannel(resourceIndex, versionIndex, channelIndex) {
  const channel = resources[resourceIndex]?.versions[versionIndex]?.channels[channelIndex];
  const text = channelCopyText(channel || {});
  if (!text) {
    showToast("该入口尚未添加");
    return;
  }
  copyText(text, channel.code ? "链接和提取码已复制" : "链接已复制");
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
      renderResourceTypes();
      renderResources();
    });
  });
}

function renderSubjects() {
  subjectNav.innerHTML = getSubjects().map(subject => {
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
      renderResourceTypes();
      renderResources();
    });
  });
}

function renderResourceTypes() {
  resourceTypeNav.innerHTML = resourceTypes.map(type => {
    const active = type === state.resourceType ? " active" : "";
    return `
      <button class="filter-chip${active}" type="button" data-resource-type="${esc(type)}">
        <span>${esc(type)}</span>
        <small>${typeCount(type)}</small>
      </button>
    `;
  }).join("");

  resourceTypeNav.querySelectorAll(".filter-chip").forEach(button => {
    button.addEventListener("click", () => {
      state.resourceType = button.dataset.resourceType;
      updateHeadings();
      renderResourceTypes();
      renderResources();
    });
  });
}

function renderChannel(channel, resourceIndex, versionIndex, channelIndex) {
  const ready = Boolean(channel.url);
  const statusClass = ready ? "" : " unavailable";
  const code = channel.code ? `<span class="channel-code">提取码 ${esc(channel.code)}</span>` : "";
  const note = channel.note ? `<span class="channel-note">${esc(channel.note)}</span>` : "";

  return `
    <div class="channel-row${statusClass}">
      <div class="channel-name">${esc(channel.label)}</div>
      <div class="channel-extra">${code}${note}</div>
      <div class="channel-actions">
        <button type="button" onclick="openChannel(${resourceIndex}, ${versionIndex}, ${channelIndex})">${ready ? "打开" : "未添加"}</button>
        <button type="button" onclick="copyChannel(${resourceIndex}, ${versionIndex}, ${channelIndex})">复制</button>
      </div>
    </div>
  `;
}

function renderVersion(version, resourceIndex, versionIndex) {
  return `
    <details class="version" ${versionIndex === 0 ? "open" : ""}>
      <summary>
        <div class="version-summary-main">
          <strong>${esc(version.name)}</strong>
          <div class="version-meta">
            ${version.meta.map(tag => `<span>${esc(tag)}</span>`).join("")}
          </div>
        </div>
        <span class="version-toggle">查看获取方式</span>
      </summary>
      <div class="version-body">
        <p class="version-note">${esc(version.note)}</p>
        <div class="channel-list">
          ${version.channels.map((channel, channelIndex) =>
            renderChannel(channel, resourceIndex, versionIndex, channelIndex)
          ).join("")}
        </div>
      </div>
    </details>
  `;
}

function renderResources() {
  const items = getFilteredResources();
  count.textContent = `${items.length} 项已收录`;
  emptyState.hidden = items.length !== 0;

  list.innerHTML = items.map(item => {
    const sourceIndex = resources.indexOf(item);

    return `
      <article class="resource-item">
        <div class="resource-head">
          <div class="resource-icon" aria-hidden="true">${esc(item.subject.slice(0, 2))}</div>
          <div class="resource-main">
            <div class="resource-title-line">
              <h2>${esc(item.title)}</h2>
              <span class="status">${esc(item.status)}</span>
            </div>
            <p class="resource-description">${esc(item.description)}</p>
            <div class="resource-tags">
              <span>${esc(item.category)}</span>
              <span>${esc(item.subject)}</span>
              <span>${esc(item.resourceType)}</span>
              <span>${item.versions.length} 个版本</span>
            </div>
          </div>
          <time datetime="${esc(item.updated)}">更新于 ${esc(item.updated)}</time>
        </div>

        <div class="versions">
          ${item.versions.map((version, versionIndex) =>
            renderVersion(version, sourceIndex, versionIndex)
          ).join("")}
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
renderResourceTypes();
renderResources();
