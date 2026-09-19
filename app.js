const resources = [
  {
    title: "408 做题本",
    description: "计算机 408 复习、刷题与知识点整理。",
    subject: "计算机",
    type: "做题本",
    status: "即将开放",
    url: ""
  },
  {
    title: "数学二做题本",
    description: "数学二刷题、复盘与错题整理。",
    subject: "数学",
    type: "做题本",
    status: "即将开放",
    url: ""
  }
];

const list = document.getElementById("resourceList");
const count = document.getElementById("resourceCount");
const toast = document.getElementById("toast");

count.textContent = `共 ${resources.length} 项`;

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
  window.__toastTimer = setTimeout(() => toast.classList.remove("show"), 1400);
}

async function copyLink(url) {
  if (!url) return showToast("该资源尚未开放");
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

list.innerHTML = resources.map((item, index) => {
  const no = String(index + 1).padStart(3, "0");
  const openAction = item.url
    ? `<a class="text-link primary" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">打开 ↗</a>`
    : `<button class="text-link muted-link" type="button" onclick="showToast('该资源尚未开放')">未开放</button>`;

  return `
    <article class="resource-row">
      <div class="resource-no">${no}</div>
      <div class="resource-main">
        <h3>${esc(item.title)}</h3>
        <p>${esc(item.description)}</p>
      </div>
      <div class="resource-meta">
        <span>${esc(item.subject)}</span>
        <span>${esc(item.type)}</span>
        <span>${esc(item.status)}</span>
      </div>
      <div class="resource-actions">
        ${openAction}
        <button class="text-link" type="button" onclick="copyLink(resources[${index}].url)">复制地址</button>
      </div>
    </article>`;
}).join("");
