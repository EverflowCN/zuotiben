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
const subjectPicker = document.getElementById("subjectPicker");
const subjectPickerButton = document.getElementById("subjectPickerButton");
const subjectPickerText = document.getElementById("subjectPickerText");
const subjectDropdown = document.getElementById("subjectDropdown");
const subjectSearchInput = document.getElementById("subjectSearchInput");
const subjectOptions = document.getElementById("subjectOptions");
const resourceTypePicker = document.getElementById("resourceTypePicker");
const resourceTypePickerButton = document.getElementById("resourceTypePickerButton");
const resourceTypePickerText = document.getElementById("resourceTypePickerText");
const resourceTypeDropdown = document.getElementById("resourceTypeDropdown");
const resourceTypeOptions = document.getElementById("resourceTypeOptions");
const clearFiltersButton = document.getElementById("clearFiltersButton");
const list = document.getElementById("resourceList");
const count = document.getElementById("resourceCount");
const searchInput = document.getElementById("searchInput");
const currentCategory = document.getElementById("currentCategory");
const currentSubject = document.getElementById("currentSubject");
const currentResourceType = document.getElementById("currentResourceType");
const pageTitle = document.getElementById("pageTitle");
const emptyState = document.getElementById("emptyState");
const toast = document.getElementById("toast");
const noticeCard = document.getElementById("noticeCard");
const dismissNoticeButton = document.getElementById("dismissNoticeButton");

function icon(name, className = "ui-icon") {
  const paths = {
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5Z"/><path d="M4 5.5v16"/>',
    file: '<path d="M6 2h8l4 4v16H6Z"/><path d="M14 2v5h5"/><path d="M9 13h6M9 17h5"/>',
    printer: '<path d="M7 8V3h10v5"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M7 14h10v7H7Z"/>',
    cloud: '<path d="M7 18h10a4 4 0 0 0 .7-7.94A6 6 0 0 0 6.2 8.2 4.5 4.5 0 0 0 7 18Z"/><path d="m12 11 0 6m-3-3 3 3 3-3"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.2 1.2"/><path d="M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.2-1.2"/>',
    layers: '<path d="m12 2 9 5-9 5-9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
    archive: '<path d="M3 5h18v4H3Z"/><path d="M5 9h14v11H5Z"/><path d="M9 13h6"/>',
    note: '<path d="M5 3h14v18H5Z"/><path d="M8 8h8M8 12h8M8 16h5"/>'
  };
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.file}</svg>`;
}

function resourceTypeIcon(type) {
  if (type === "书籍") return "book";
  if (type === "讲义" || type === "真题" || type === "题库") return "file";
  if (type === "笔记") return "note";
  if (type === "做题本" || type === "模拟卷" || type === "冲刺资料") return "layers";
  return "archive";
}

function channelIcon(label) {
  if (label.includes("打印")) return "printer";
  if (label.includes("网盘")) return "cloud";
  if (label.includes("直链")) return "link";
  return "file";
}

function esc(text) {
  return String(text ?? "").replace(/[&<>'"]/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[ch]));
}

function checkIcon() {
  return '<svg class="check-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="m5.5 10.3 2.8 2.8 6.2-6.3"/></svg>';
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

  clearFiltersButton.hidden =
    state.category === "全部" &&
    state.subject === "全部科目" &&
    state.resourceType === "全部资源";
}

function searchableText(item) {
  const versionText = item.versions.flatMap(version => [
    version.name,
    version.note,
    ...version.meta,
    ...version.channels.flatMap(channel => [channel.label, channel.note, channel.code])
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
  return channel.code ? `${channel.url}\n提取码：${channel.code}` : channel.url;
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
        <span class="category-count">${categoryCount(category) || ""}</span>
      </button>
    `;
  }).join("");

  categoryNav.querySelectorAll(".category-item").forEach(button => {
    button.addEventListener("click", () => {
      state.category = button.dataset.category;
      state.subject = "全部科目";
      closeAllPopovers();
      renderAll();
    });
  });
}

function getSubjectGroups(query = "") {
  const normalized = query.trim().toLowerCase();
  const groups = state.category === "全部"
    ? catalog
    : catalog.filter(group => group.name === state.category);

  return groups
    .map(group => ({
      name: group.name,
      subjects: group.subjects.filter(subject =>
        !normalized || subject.toLowerCase().includes(normalized)
      )
    }))
    .filter(group => group.subjects.length);
}

function renderSubjectOptions(query = "") {
  const normalized = query.trim().toLowerCase();
  const showAll = !normalized || "全部科目".includes(query);
  const allCount = subjectCount("全部科目");
  const groups = getSubjectGroups(query);

  let html = "";

  if (showAll) {
    html += `
      <button class="command-item${state.subject === "全部科目" ? " selected" : ""}" type="button" role="option" data-subject="全部科目">
        <span class="command-item-main">
          <span>全部科目</span>
          ${allCount ? `<small>${allCount} 项</small>` : ""}
        </span>
        ${state.subject === "全部科目" ? checkIcon() : ""}
      </button>
    `;
  }

  groups.forEach(group => {
    html += `<div class="command-group-label">${esc(group.name)}</div>`;
    html += group.subjects.map(subject => {
      const active = subject === state.subject;
      const subjectResources = subjectCount(subject);
      return `
        <button class="command-item${active ? " selected" : ""}" type="button" role="option" data-subject="${esc(subject)}">
          <span class="command-item-main">
            <span>${esc(subject)}</span>
            ${subjectResources ? `<small>${subjectResources} 项</small>` : ""}
          </span>
          ${active ? checkIcon() : ""}
        </button>
      `;
    }).join("");
  });

  subjectOptions.innerHTML = html || '<div class="command-empty">没有匹配的科目</div>';

  subjectOptions.querySelectorAll("[data-subject]").forEach(button => {
    button.addEventListener("click", () => {
      state.subject = button.dataset.subject;
      closeSubjectDropdown();
      renderAll();
    });
  });
}

function renderSubjectPicker() {
  subjectPickerText.textContent = state.subject;
  renderSubjectOptions(subjectSearchInput.value);
}

function renderResourceTypeOptions() {
  resourceTypeOptions.innerHTML = resourceTypes.map(type => {
    const active = type === state.resourceType;
    const total = typeCount(type);
    return `
      <button class="command-item${active ? " selected" : ""}" type="button" role="option" data-resource-type="${esc(type)}">
        <span class="command-item-main">
          ${icon(resourceTypeIcon(type), "menu-icon")}
          <span>${esc(type)}</span>
          ${total ? `<small>${total} 项</small>` : ""}
        </span>
        ${active ? checkIcon() : ""}
      </button>
    `;
  }).join("");

  resourceTypeOptions.querySelectorAll("[data-resource-type]").forEach(button => {
    button.addEventListener("click", () => {
      state.resourceType = button.dataset.resourceType;
      closeResourceTypeDropdown();
      renderAll();
    });
  });
}

function renderResourceTypePicker() {
  resourceTypePickerText.textContent = state.resourceType;
  renderResourceTypeOptions();
}

function openSubjectDropdown() {
  closeResourceTypeDropdown();
  subjectDropdown.hidden = false;
  subjectPickerButton.setAttribute("aria-expanded", "true");
  subjectSearchInput.value = "";
  renderSubjectOptions("");
  requestAnimationFrame(() => subjectSearchInput.focus());
}

function closeSubjectDropdown() {
  subjectDropdown.hidden = true;
  subjectPickerButton.setAttribute("aria-expanded", "false");
  subjectSearchInput.value = "";
}

function openResourceTypeDropdown() {
  closeSubjectDropdown();
  resourceTypeDropdown.hidden = false;
  resourceTypePickerButton.setAttribute("aria-expanded", "true");
  renderResourceTypeOptions();
}

function closeResourceTypeDropdown() {
  resourceTypeDropdown.hidden = true;
  resourceTypePickerButton.setAttribute("aria-expanded", "false");
}

function closeAllPopovers() {
  closeSubjectDropdown();
  closeResourceTypeDropdown();
}

function renderChannel(channel, resourceIndex, versionIndex, channelIndex) {
  const ready = Boolean(channel.url);
  const statusClass = ready ? "" : " unavailable";
  const code = channel.code ? `<span class="channel-code">提取码 ${esc(channel.code)}</span>` : "";
  const note = channel.note ? `<span class="channel-note">${esc(channel.note)}</span>` : "";

  return `
    <div class="channel-row${statusClass}">
      <div class="channel-name">
        ${icon(channelIcon(channel.label), "channel-icon")}
        <span>${esc(channel.label)}</span>
      </div>
      <div class="channel-extra">${code}${note}</div>
      <div class="channel-actions">
        <button type="button" onclick="openChannel(${resourceIndex}, ${versionIndex}, ${channelIndex})">${ready ? "打开" : "未添加"}</button>
        <button type="button" onclick="copyChannel(${resourceIndex}, ${versionIndex}, ${channelIndex})">复制</button>
      </div>
    </div>
  `;
}

function renderVersion(version, resourceIndex, versionIndex) {
  const isPrint = version.name.includes("打印");
  return `
    <details class="version" ${versionIndex === 0 ? "open" : ""}>
      <summary>
        <div class="version-summary-main">
          ${icon(isPrint ? "printer" : "file", "version-icon")}
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
          <div class="resource-icon" aria-hidden="true">
            ${icon(resourceTypeIcon(item.resourceType), "resource-type-icon")}
          </div>
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

function renderAll() {
  updateHeadings();
  renderCategories();
  renderSubjectPicker();
  renderResourceTypePicker();
  renderResources();
}

function initNotice() {
  if (!noticeCard || !dismissNoticeButton) return;
  const version = noticeCard.dataset.noticeVersion || "";
  const dismissed = localStorage.getItem("yanku-notice-dismissed");
  if (dismissed === version) {
    noticeCard.hidden = true;
  }

  dismissNoticeButton.addEventListener("click", () => {
    localStorage.setItem("yanku-notice-dismissed", version);
    noticeCard.hidden = true;
  });
}

subjectPickerButton.addEventListener("click", () => {
  subjectDropdown.hidden ? openSubjectDropdown() : closeSubjectDropdown();
});

resourceTypePickerButton.addEventListener("click", () => {
  resourceTypeDropdown.hidden ? openResourceTypeDropdown() : closeResourceTypeDropdown();
});

subjectSearchInput.addEventListener("input", event => {
  renderSubjectOptions(event.target.value);
});

clearFiltersButton.addEventListener("click", () => {
  state.category = "全部";
  state.subject = "全部科目";
  state.resourceType = "全部资源";
  closeAllPopovers();
  renderAll();
});

document.addEventListener("click", event => {
  if (!subjectPicker.contains(event.target) && !resourceTypePicker.contains(event.target)) {
    closeAllPopovers();
  }
});

searchInput.addEventListener("input", event => {
  state.query = event.target.value;
  renderResources();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && (!subjectDropdown.hidden || !resourceTypeDropdown.hidden)) {
    closeAllPopovers();
    return;
  }

  if (
    event.key === "/" &&
    document.activeElement !== searchInput &&
    document.activeElement !== subjectSearchInput &&
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

initNotice();
renderAll();
