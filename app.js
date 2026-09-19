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
const experiencePosts = [];
const errataItems = [];
const announcements = [
  { id: "notice-update", type: "更新通知", title: "资源中心持续整理中", body: "资料会按标准版、平板版、打印专版等分别发布；经验贴与勘误栏目也会逐步补充。", date: "2026-09-19" },
  { id: "notice-guide", type: "使用说明", title: "同一资源可能存在多个版本与入口", body: "标准版、平板版、打印专版会分别标注；百度网盘、夸克网盘、直链与打印入口以对应版本为准。发现题目、答案、排版或链接问题时，可在勘误中提交。", date: "2026-09-19" }
];

const siteSettings = {
  errataSubmitUrl: localStorage.getItem("yanku-errata-submit-url") || ""
};
const pinState = {
  resources: new Set(JSON.parse(localStorage.getItem("yanku-pinned-resource-titles") || "[]")),
  announcements: new Set(JSON.parse(localStorage.getItem("yanku-pinned-announcement-titles") || "[]"))
};
function isResourcePinned(item){ return pinState.resources.has(item.title); }
function isAnnouncementPinned(item){ return pinState.announcements.has(item.title); }

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
  section: "overview",
  category: "全部",
  subject: "全部科目",
  resourceType: "全部资源",
  query: ""
};

const sectionNav = document.getElementById("sectionNav");
const categorySection = document.getElementById("categorySection");
const categoryNav = document.getElementById("categoryNav");
const overviewView = document.getElementById("overviewView");
const resourceView = document.getElementById("resourceView");
const experienceView = document.getElementById("experienceView");
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
const breadcrumb = document.getElementById("breadcrumb");
const eyebrow = document.getElementById("eyebrow");
const pageTitle = document.getElementById("pageTitle");
const contentDesc = document.getElementById("contentDesc");
const emptyState = document.getElementById("emptyState");
const toast = document.getElementById("toast");
const mobileMenuButton = document.getElementById("mobileMenuButton");
const mobileMenuClose = document.getElementById("mobileMenuClose");
const mobileSidebar = document.getElementById("mobileSidebar");
const mobileDrawerBackdrop = document.getElementById("mobileDrawerBackdrop");
const unifiedModalBackdrop = document.getElementById("unifiedModalBackdrop");
const unifiedModal = document.getElementById("unifiedModal");
const unifiedModalClose = document.getElementById("unifiedModalClose");
const unifiedModalKicker = document.getElementById("unifiedModalKicker");
const unifiedModalTitle = document.getElementById("unifiedModalTitle");
const unifiedModalBody = document.getElementById("unifiedModalBody");
const unifiedModalActions = document.getElementById("unifiedModalActions");

function esc(text) {
  return String(text ?? "").replace(/[&<>'"]/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[ch]));
}

function icon(name, className = "ui-icon") {
  const paths = {
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5Z"/><path d="M4 5.5v16"/>',
    file: '<path d="M6 2h8l4 4v16H6Z"/><path d="M14 2v5h5"/><path d="M9 13h6M9 17h5"/>',
    printer: '<path d="M7 8V3h10v5"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M7 14h10v7H7Z"/>',
    cloud: '<path d="M7 18h10a4 4 0 0 0 .7-7.94A6 6 0 0 0 6.2 8.2 4.5 4.5 0 0 0 7 18Z"/><path d="m12 11 0 6m-3-3 3 3 3-3"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.2 1.2"/><path d="M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.2-1.2"/>',
    layers: '<path d="m12 2 9 5-9 5-9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
    archive: '<path d="M3 5h18v4H3Z"/><path d="M5 9h14v11H5Z"/><path d="M9 13h6"/>',
    note: '<path d="M5 3h14v18H5Z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>',
    article: '<path d="M5 4h14v16H5Z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    errata: '<path d="M4 5h10v14H4Z"/><path d="M7 9h4M7 13h4"/><circle cx="17" cy="16" r="3"/><path d="m19.2 18.2 2 2"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7"/><path d="M10 19a2 2 0 0 0 4 0"/>',
    chevron: '<path d="m8 9 4 4 4-4"/>'
  };
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.file}</svg>`;
}

function resourceTypeIcon(type) {
  if (type === "书籍") return "book";
  if (["讲义","真题","题库"].includes(type)) return "file";
  if (type === "笔记") return "note";
  if (["做题本","模拟卷","冲刺资料"].includes(type)) return "layers";
  return "archive";
}

function channelIcon(label) {
  if (label.includes("打印")) return "printer";
  if (label.includes("网盘")) return "cloud";
  if (label.includes("直链")) return "link";
  return "file";
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

function getVisibleCategories() {
  return catalog.map(item => item.name).filter(name => categoryCount(name) > 0);
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

function searchableText(item) {
  return [
    item.title, item.description, item.category, item.subject, item.resourceType, item.status,
    ...item.versions.flatMap(version => [
      version.name, version.note, ...version.meta,
      ...version.channels.flatMap(channel => [channel.label, channel.note, channel.code])
    ])
  ].join(" ").toLowerCase();
}

function getFilteredResources() {
  const query = state.query.trim().toLowerCase();
  return resources
    .filter(item => state.category === "全部" || item.category === state.category)
    .filter(item => state.subject === "全部科目" || item.subject === state.subject)
    .filter(item => state.resourceType === "全部资源" || item.resourceType === state.resourceType)
    .filter(item => !query || searchableText(item).includes(query))
    .sort((a,b) => Number(isResourcePinned(b)) - Number(isResourcePinned(a)) || b.updated.localeCompare(a.updated));
}

function commitViewUpdate(update) {
  update();
  renderAll();
}

function renderSections() {
  const sections = [
    { id: "overview", label: "总览", icon: "home", count: 0 },
    { id: "resources", label: "资料", icon: "book", count: resources.length },
    { id: "experience", label: "经验贴", icon: "article", count: experiencePosts.length }
  ];

  let html = "";
  sections.forEach(section => {
    html += '<div class="nav-block">';
    html += '<button class="nav-main' + (state.section === section.id ? ' active' : '') + '" type="button" data-section="' + section.id + '">';
    html += icon(section.icon, "nav-icon") + '<span>' + section.label + '</span>';
    if (section.count) html += '<b>' + section.count + '</b>';
    if (section.id === "resources") html += icon("chevron", "nav-chevron");
    html += '</button>';

    if (section.id === "resources" && state.section === "resources") {
      html += '<div class="nav-children">';
      html += '<button class="nav-child' + (state.category === "全部" ? ' active' : '') + '" type="button" data-category="全部"><span>全部资料</span><b>' + resources.length + '</b></button>';
      getVisibleCategories().forEach(category => {
        html += '<button class="nav-child' + (state.category === category ? ' active' : '') + '" type="button" data-category="' + esc(category) + '"><span>' + esc(category) + '</span><b>' + categoryCount(category) + '</b></button>';
      });
      html += '</div>';
    }
    html += '</div>';
  });
  sectionNav.innerHTML = html;

  sectionNav.querySelectorAll("[data-section]").forEach(button => {
    button.addEventListener("click", () => {
      closeMobileDrawer();
      commitViewUpdate(() => {
        state.section = button.dataset.section;
        state.query = "";
        searchInput.value = "";
        if (state.section !== "resources") {
          state.category = "全部";
          state.subject = "全部科目";
          state.resourceType = "全部资源";
        }
      });
    });
  });

  sectionNav.querySelectorAll("[data-category]").forEach(button => {
    button.addEventListener("click", () => {
      closeMobileDrawer();
      closeAllPopovers();
      commitViewUpdate(() => {
        state.section = "resources";
        state.category = button.dataset.category;
        state.subject = "全部科目";
      });
    });
  });
}

function renderCategories() {
  categorySection.hidden = true;
  categoryNav.innerHTML = "";
}

function getSubjectGroups(query = "") {
  const normalized = query.trim().toLowerCase();
  const groups = state.category === "全部" ? catalog : catalog.filter(group => group.name === state.category);
  return groups.map(group => ({
    name: group.name,
    subjects: group.subjects.filter(subject => subjectCount(subject) > 0 && (!normalized || subject.toLowerCase().includes(normalized)))
  })).filter(group => group.subjects.length);
}

function renderSubjectOptions(query = "") {
  const normalized = query.trim().toLowerCase();
  const showAll = !normalized || "全部科目".includes(query);
  const groups = getSubjectGroups(query);
  let html = "";

  if (showAll) {
    html += `
      <button class="command-item${state.subject === "全部科目" ? " selected" : ""}" type="button" data-subject="全部科目">
        <span class="command-item-main"><span>全部科目</span><small>${subjectCount("全部科目")} 项</small></span>
        ${state.subject === "全部科目" ? checkIcon() : ""}
      </button>`;
  }

  groups.forEach(group => {
    html += `<div class="command-group-label">${esc(group.name)}</div>`;
    html += group.subjects.map(subject => `
      <button class="command-item${state.subject === subject ? " selected" : ""}" type="button" data-subject="${esc(subject)}">
        <span class="command-item-main"><span>${esc(subject)}</span><small>${subjectCount(subject)} 项</small></span>
        ${state.subject === subject ? checkIcon() : ""}
      </button>`
    ).join("");
  });

  subjectOptions.innerHTML = html || '<div class="command-empty">没有匹配的已收录科目</div>';
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
  const visibleTypes = resourceTypes.filter(type => type === "全部资源" || typeCount(type) > 0);
  resourceTypeOptions.innerHTML = visibleTypes.map(type => `
    <button class="command-item${state.resourceType === type ? " selected" : ""}" type="button" data-resource-type="${esc(type)}">
      <span class="command-item-main">
        ${icon(resourceTypeIcon(type), "menu-icon")}
        <span>${esc(type)}</span>
        <small>${typeCount(type)} 项</small>
      </span>
      ${state.resourceType === type ? checkIcon() : ""}
    </button>`
  ).join("");

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
  subjectPickerButton.setAttribute("aria-expanded","true");
  subjectSearchInput.value = "";
  renderSubjectOptions();
  requestAnimationFrame(() => subjectSearchInput.focus());
}
function closeSubjectDropdown() {
  subjectDropdown.hidden = true;
  subjectPickerButton.setAttribute("aria-expanded","false");
  subjectSearchInput.value = "";
}
function openResourceTypeDropdown() {
  closeSubjectDropdown();
  resourceTypeDropdown.hidden = false;
  resourceTypePickerButton.setAttribute("aria-expanded","true");
  renderResourceTypeOptions();
}
function closeResourceTypeDropdown() {
  resourceTypeDropdown.hidden = true;
  resourceTypePickerButton.setAttribute("aria-expanded","false");
}
function closeAllPopovers() {
  closeSubjectDropdown();
  closeResourceTypeDropdown();
}

function openUnifiedModal({ kicker="DETAIL", title="详情", body="", actions=[] } = {}) {
  unifiedModalKicker.textContent = kicker;
  unifiedModalTitle.textContent = title;
  unifiedModalBody.innerHTML = body;
  unifiedModalActions.innerHTML = actions.map((action,index) =>
    '<button type="button" class="modal-action ' + (action.primary ? 'primary' : '') + '" data-modal-action="' + index + '">' + esc(action.label) + '</button>'
  ).join("");
  unifiedModal.hidden = false;
  unifiedModalBackdrop.hidden = false;
  document.body.classList.add("modal-open");
  unifiedModalActions.querySelectorAll("[data-modal-action]").forEach(button => {
    button.addEventListener("click", () => actions[Number(button.dataset.modalAction)]?.onClick?.());
  });
}
function closeUnifiedModal() {
  unifiedModal.hidden = true;
  unifiedModalBackdrop.hidden = true;
  document.body.classList.remove("modal-open");
}
unifiedModalClose?.addEventListener("click", closeUnifiedModal);
unifiedModalBackdrop?.addEventListener("click", closeUnifiedModal);

function copyText(text, message="已复制") {
  if (!text) return showToast("暂无可复制内容");
  navigator.clipboard?.writeText(text).then(() => showToast(message)).catch(() => {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    showToast(message);
  });
}

function openChannel(resourceIndex,versionIndex,channelIndex) {
  const channel = resources[resourceIndex]?.versions[versionIndex]?.channels[channelIndex];
  if (!channel) return;
  const ready = Boolean(channel.url);
  const body = [
    channel.note ? '<div class="modal-detail-row"><span>说明</span><strong>' + esc(channel.note) + '</strong></div>' : '',
    channel.code ? '<div class="modal-detail-row"><span>提取码</span><strong class="mono">' + esc(channel.code) + '</strong></div>' : '',
    ready ? '<div class="modal-link-box">' + esc(channel.url) + '</div>' : '<div class="modal-empty"><strong>暂未开放</strong><p>这个获取入口还没有添加链接。</p></div>'
  ].join("");
  const actions = ready ? [
    { label: "复制", onClick: () => copyChannel(resourceIndex,versionIndex,channelIndex) },
    { label: "打开链接", primary: true, onClick: () => window.open(channel.url,"_blank","noopener,noreferrer") }
  ] : [];
  openUnifiedModal({ kicker: "RESOURCE LINK", title: channel.label, body, actions });
}
function copyChannel(resourceIndex,versionIndex,channelIndex) {
  const channel = resources[resourceIndex]?.versions[versionIndex]?.channels[channelIndex];
  if (!channel?.url) return showToast("该入口尚未添加");
  copyText(channel.code ? `${channel.url}\n提取码：${channel.code}` : channel.url, channel.code ? "链接和提取码已复制" : "链接已复制");
}

function renderChannel(channel,resourceIndex,versionIndex,channelIndex) {
  const ready = Boolean(channel.url);
  return `
    <div class="channel-row${ready ? "" : " unavailable"}">
      <div class="channel-name">${icon(channelIcon(channel.label),"channel-icon")}<span>${esc(channel.label)}</span></div>
      <div class="channel-extra">
        ${channel.code ? `<span class="channel-code">提取码 ${esc(channel.code)}</span>` : ""}
        ${channel.note ? `<span>${esc(channel.note)}</span>` : ""}
      </div>
      <div class="channel-actions">
        <button type="button" onclick="openChannel(${resourceIndex},${versionIndex},${channelIndex})">${ready ? "打开" : "未添加"}</button>
        <button type="button" onclick="copyChannel(${resourceIndex},${versionIndex},${channelIndex})">复制</button>
      </div>
    </div>`;
}

function openErrataSubmit(resourceIndex,versionIndex) {
  const resource = resources[resourceIndex];
  const version = resource?.versions?.[versionIndex];
  const raw = siteSettings.errataSubmitUrl?.trim();
  if (!raw) {
    showToast("后台尚未配置勘误提交链接");
    return;
  }
  try {
    const target = new URL(raw, window.location.href);
    if (resource) target.searchParams.set("resource", resource.title);
    if (version) target.searchParams.set("version", version.name);
    window.open(target.toString(), "_blank", "noopener,noreferrer");
  } catch {
    window.open(raw, "_blank", "noopener,noreferrer");
  }
}

function openErrata(resourceIndex,versionIndex) {
  const resource = resources[resourceIndex];
  const version = resource?.versions?.[versionIndex];
  if (!resource || !version) return;
  const items = version.errata || [];
  const body = items.length
    ? '<div class="modal-stack">' + items.map(item => '<article class="modal-errata-item"><div><span class="pill">' + esc(item.status || "已记录") + '</span><strong>' + esc(item.title || "勘误") + '</strong></div><p>' + esc(item.body || "") + '</p></article>').join("") + '</div>'
    : '<div class="modal-empty"><strong>暂无公开勘误</strong><p>如果发现题目、答案、排版或链接问题，可以提交反馈；接入后台后这里会显示核对与修正状态。</p></div>';
  openUnifiedModal({
    kicker: "ERRATA",
    title: resource.title + " · " + version.name,
    body,
    actions: [{ label: "申请提交", primary: true, onClick: () => openErrataSubmit(resourceIndex,versionIndex) }]
  });
}

function renderVersion(version,resourceIndex,versionIndex) {
  return `
    <details class="version" ${versionIndex === 0 ? "open" : ""}>
      <summary>
        <div class="version-summary-main">
          ${icon(version.name.includes("打印") ? "printer" : "file","version-icon")}
          <strong>${esc(version.name)}</strong>
          <div class="version-meta">${version.meta.map(tag => `<span>${esc(tag)}</span>`).join("")}</div>
        </div>
        <span class="version-toggle">查看获取方式</span>
      </summary>
      <div class="version-body">
        <p class="version-note">${esc(version.note)}</p>
        <div class="channel-list">
          ${version.channels.map((channel,channelIndex) => renderChannel(channel,resourceIndex,versionIndex,channelIndex)).join("")}
          <div class="channel-row errata-channel">
            <div class="channel-name">${icon("errata","channel-icon")}<span>勘误</span></div>
            <div class="channel-extra"><span>${(version.errata || []).length ? (version.errata || []).length + " 条公开记录" : "暂无公开勘误"}</span></div>
            <div class="channel-actions"><button type="button" onclick="openErrata(${resourceIndex},${versionIndex})">查看</button><button type="button" onclick="openErrataSubmit(${resourceIndex},${versionIndex})">申请提交</button></div>
          </div>
        </div>
      </div>
    </details>`;
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
          <div class="resource-icon">${icon(resourceTypeIcon(item.resourceType),"resource-type-icon")}</div>
          <div class="resource-main">
            <div class="resource-title-line"><h2>${esc(item.title)}</h2>${isResourcePinned(item) ? '<span class="pin-badge">置顶</span>' : ""}<span class="status">${esc(item.status)}</span></div>
            <p class="resource-description">${esc(item.description)}</p>
            <div class="resource-tags">
              <span>${esc(item.category)}</span><span>${esc(item.subject)}</span><span>${esc(item.resourceType)}</span><span>${item.versions.length} 个版本</span>
            </div>
          </div>
          <time datetime="${esc(item.updated)}">更新于 ${esc(item.updated)}</time>
        </div>
        <div class="versions">${item.versions.map((version,i) => renderVersion(version,sourceIndex,i)).join("")}</div>
      </article>`;
  }).join("");
}

function renderOverview() {
  const versionCount = resources.reduce((sum,item) => sum + item.versions.length,0);
  const errataCount = resources.reduce((sum,item) => sum + item.versions.reduce((n,version) => n + (version.errata || []).length,0),0);
  const notice = announcements.find(isAnnouncementPinned) || announcements[0];

  document.getElementById("metricResources").textContent = resources.length;
  document.getElementById("metricVersions").textContent = versionCount;
  document.getElementById("metricErrata").textContent = errataCount;
  document.getElementById("metricExperience").textContent = experiencePosts.length;

  if (notice) {
    document.getElementById("overviewNoticeTitle").textContent = notice.title;
    document.getElementById("overviewNoticeBody").textContent = notice.body;
    document.getElementById("overviewNoticeDate").textContent = notice.date;
  }

  document.getElementById("recentResources").innerHTML = resources
    .slice()
    .sort((a,b) => Number(isResourcePinned(b)) - Number(isResourcePinned(a)) || b.updated.localeCompare(a.updated))
    .slice(0,4)
    .map(item => '<button class="overview-row" type="button" data-resource-category="' + esc(item.category) + '"><span class="overview-row-icon">' + icon(resourceTypeIcon(item.resourceType)) + '</span><span><strong>' + esc(item.title) + '</strong><small>' + esc(item.category) + ' · ' + esc(item.subject) + ' · ' + item.versions.length + ' 个版本</small></span><time>' + esc(item.updated) + '</time></button>')
    .join("");
}

function openAnnouncementModal(index=0) {
  const item = announcements[index];
  if (!item) return;
  openUnifiedModal({
    kicker: item.type === "更新通知" ? "NOTICE" : "GUIDE",
    title: item.title,
    body: '<div class="modal-article"><p>' + esc(item.body) + '</p><time>' + esc(item.date) + '</time></div>'
  });
}
function openAnnouncementListModal() {
  openUnifiedModal({
    kicker: "NOTICE",
    title: "公告",
    body: '<div class="modal-stack">' + announcements.map((item,index) =>
      '<button class="modal-list-button" type="button" data-modal-notice-index="' + index + '"><span>' + esc(item.type) + '</span><strong>' + esc(item.title) + '</strong><small>' + esc(item.date) + '</small></button>'
    ).join("") + '</div>'
  });
  unifiedModalBody.querySelectorAll("[data-modal-notice-index]").forEach(button => {
    button.addEventListener("click", () => openAnnouncementModal(Number(button.dataset.modalNoticeIndex)));
  });
}

function updatePageMode() {
  overviewView.hidden = state.section !== "overview";
  resourceView.hidden = state.section !== "resources";
  experienceView.hidden = state.section !== "experience";
  breadcrumb.hidden = state.section !== "resources";

  if (state.section === "overview") {
    eyebrow.textContent = "OVERVIEW";
    pageTitle.textContent = "总览";
    contentDesc.textContent = "快速查看最近更新、公告、勘误与资源收录情况。";
    searchInput.placeholder = "搜索资源、科目、经验或勘误";
    count.textContent = "";
    renderOverview();
  } else if (state.section === "resources") {
    eyebrow.textContent = "RESOURCE LIBRARY";
    pageTitle.textContent = state.subject !== "全部科目" ? state.subject + "资源" : state.category !== "全部" ? state.category + "资源" : state.resourceType !== "全部资源" ? state.resourceType : "全部资源";
    contentDesc.textContent = "书籍、讲义、真题、做题本与打印版本统一索引；同一资源可以提供多个版本和多个获取入口。";
    searchInput.placeholder = "搜索资源、科目、版本或关键词";
    breadcrumb.innerHTML = esc(state.category) + ' <span>›</span> ' + esc(state.subject) + ' <span>›</span> ' + esc(state.resourceType);
    clearFiltersButton.hidden = state.category === "全部" && state.subject === "全部科目" && state.resourceType === "全部资源";
  } else if (state.section === "experience") {
    eyebrow.textContent = "EXPERIENCE";
    pageTitle.textContent = "经验贴";
    contentDesc.textContent = "围绕院校、专业、初试、复试、择校与备考方法整理可追溯来源的经验内容。";
    searchInput.placeholder = "搜索经验贴、院校或专业";
    count.textContent = experiencePosts.length ? experiencePosts.length + " 篇" : "";
  }
}

function renderAll() {
  renderSections();
  renderCategories();
  renderSubjectPicker();
  renderResourceTypePicker();
  updatePageMode();
  if (state.section === "resources") renderResources();
}

function openMobileDrawer() {
  if (!mobileSidebar || !mobileDrawerBackdrop || !mobileMenuButton) return;
  mobileSidebar.classList.add("mobile-open");
  mobileDrawerBackdrop.hidden = false;
  mobileDrawerBackdrop.style.pointerEvents = "auto";
  requestAnimationFrame(() => mobileDrawerBackdrop.classList.add("show"));
  mobileMenuButton.setAttribute("aria-expanded", "true");
  document.body.classList.add("drawer-open");
}

function closeMobileDrawer() {
  if (!mobileSidebar || !mobileDrawerBackdrop || !mobileMenuButton) return;
  mobileSidebar.classList.remove("mobile-open");
  mobileDrawerBackdrop.classList.remove("show");
  mobileDrawerBackdrop.style.pointerEvents = "none";
  mobileMenuButton.setAttribute("aria-expanded", "false");
  document.body.classList.remove("drawer-open");
  setTimeout(() => {
    if (!mobileDrawerBackdrop.classList.contains("show")) {
      mobileDrawerBackdrop.hidden = true;
    }
  }, 220);
}

function initMobileDrawer() {
  mobileMenuButton?.addEventListener("click", openMobileDrawer);
  mobileMenuClose?.addEventListener("click", closeMobileDrawer);
  mobileDrawerBackdrop?.addEventListener("click", closeMobileDrawer);

  mobileSidebar?.addEventListener("click", event => {
    if (event.target.closest("[data-section], [data-category]")) {
      closeMobileDrawer();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 560) closeMobileDrawer();
  });
}

subjectPickerButton.addEventListener("click",() => subjectDropdown.hidden ? openSubjectDropdown() : closeSubjectDropdown());
resourceTypePickerButton.addEventListener("click",() => resourceTypeDropdown.hidden ? openResourceTypeDropdown() : closeResourceTypeDropdown());
subjectSearchInput.addEventListener("input",e => renderSubjectOptions(e.target.value));
clearFiltersButton.addEventListener("click",() => {
  state.category = "全部"; state.subject = "全部科目"; state.resourceType = "全部资源";
  closeAllPopovers(); renderAll();
});

document.addEventListener("click", event => {
  const announcement = event.target.closest("[data-announcement-index]");
  if (announcement) {
    openAnnouncementModal(Number(announcement.dataset.announcementIndex));
    return;
  }
  const announcementList = event.target.closest("[data-open-announcements]");
  if (announcementList) {
    openAnnouncementListModal();
    return;
  }
  const errataSubmit = event.target.closest("[data-open-errata-submit]");
  if (errataSubmit) {
    openErrataSubmit();
    return;
  }
  const go = event.target.closest("[data-go]");
  if (go) {
    closeMobileDrawer();
    commitViewUpdate(() => {
      state.section = go.dataset.go;
    });
    return;
  }
  const resourceJump = event.target.closest("[data-resource-category]");
  if (resourceJump) {
    closeMobileDrawer();
    commitViewUpdate(() => {
      state.section = "resources";
      state.category = resourceJump.dataset.resourceCategory;
      state.subject = "全部科目";
    });
  }
});

document.addEventListener("click",e => {
  if (!subjectPicker.contains(e.target) && !resourceTypePicker.contains(e.target)) closeAllPopovers();
});
searchInput.addEventListener("input",e => {
  state.query = e.target.value;
  if (state.section === "resources") renderResources();
});
document.addEventListener("keydown",e => {
  if (e.key === "Escape" && !unifiedModal.hidden) {
    closeUnifiedModal();
    return;
  }
  if (e.key === "Escape" && mobileSidebar?.classList.contains("mobile-open")) {
    closeMobileDrawer();
    return;
  }
  if (e.key === "Escape" && (!subjectDropdown.hidden || !resourceTypeDropdown.hidden)) return closeAllPopovers();
  if (e.key === "/" && !["INPUT","TEXTAREA"].includes(document.activeElement?.tagName)) {
    e.preventDefault(); searchInput.focus();
  }
});

initMobileDrawer();
renderAll();