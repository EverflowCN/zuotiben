const contributors = [
  "Everflow 团队",
  "资料整理与校对贡献者"
];

const resources = [
  {
    title: "408 做题本",
    description: "用于计算机 408 复习与刷题的公开做题本。",
    tag: "408",
    format: "PDF / 在线资源",
    status: "待填入正式链接",
    url: ""
  },
  {
    title: "数学二做题本",
    description: "用于数学二复习、刷题与错题整理的公开做题本。",
    tag: "数学二",
    format: "PDF / 在线资源",
    status: "待填入正式链接",
    url: ""
  }
];

const grid = document.getElementById("resourceGrid");
const count = document.getElementById("resourceCount");
const toast = document.getElementById("toast");

count.textContent = `${resources.length} 项资源`;

function esc(text) {
  return String(text ?? "").replace(/[&<>'"]/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':'&quot;'}[ch]));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => toast.classList.remove("show"), 1500);
}

async function copyLink(url) {
  if (!url) return showToast("请先填入正式资源链接");
  try {
    await navigator.clipboard.writeText(url);
    showToast("链接已复制");
  } catch {
    const ta = document.createElement("textarea");
    ta.value = url; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove();
    showToast("链接已复制");
  }
}

if (!resources.length) {
  grid.innerHTML = '<div class="empty">暂无资源</div>';
} else {
  grid.innerHTML = resources.map((item, i) => {
    const usable = Boolean(item.url);
    const open = usable
      ? `<a class="btn btn-primary" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">打开资源 ↗</a>`
      : `<button class="btn btn-primary" type="button" onclick="showToast('请先填入正式资源链接')">即将开放</button>`;
    return `
      <article class="resource-card">
        <div class="resource-top">
          <div>
            <span class="kicker">FREE WORKBOOK</span>
            <h3>${esc(item.title)}</h3>
          </div>
          <span class="badge">${esc(item.tag)}</span>
        </div>
        <p>${esc(item.description)}</p>
        <div class="meta"><span>${esc(item.format)}</span><span>${esc(item.status)}</span></div>
        <div class="actions">
          ${open}
          <button class="btn btn-secondary" type="button" onclick="copyLink(resources[${i}].url)">复制链接</button>
        </div>
      </article>`;
  }).join("");
}
