// Explicit warning while only Aldine's static React app is deployed.
(() => {
  // Local BusyTeX workspace is operational without the Node.js API.
  if (new URLSearchParams(location.search).get('local') === '1') return;
  const show = () => {
    if (document.getElementById('everflow-aldine-offline')) return;
    const el = document.createElement('aside');
    el.id = 'everflow-aldine-offline';
    el.setAttribute('role', 'status');
    el.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:999999;width:min(92vw,850px);background:#28231a;color:#ffe8b6;border:1px solid #a88c53;border-radius:12px;padding:12px 17px;font:13px/1.6 system-ui,sans-serif;box-shadow:0 5px 28px #0006;text-align:center;pointer-events:none';
    el.textContent = '已加载真实 Aldine 前端；Node.js 后端和 TeX Live 编译容器尚未接入，项目管理与 PDF 编译暂不可用。';
    document.body.appendChild(el);
  };
  fetch('/latex/api/health', { cache: 'no-store', headers: { Accept: 'application/json' } })
    .then(async (res) => {
      if (!res.ok || !(res.headers.get('content-type') || '').includes('application/json')) throw Error('no backend');
      const data = await res.json();
      if (!data || data.ok !== true) throw Error('bad health result');
    })
    .catch(show);
})();
