/**
 * Renders non-blocking user feedback inside an isolated Shadow DOM container.
 * Guaranteed not to conflict with or inherit styles from the host page.
 */
export function showBlueprintToast(title: string, message: string, type: 'success' | 'info' | 'error' = 'success'): void {
  const containerId = '__blueprint_extractor_toast_host__';
  let host = document.getElementById(containerId);

  if (!host) {
    host = document.createElement('div');
    host.id = containerId;
    host.style.position = 'fixed';
    host.style.top = '20px';
    host.style.right = '20px';
    host.style.zIndex = '2147483647';
    host.style.pointerEvents = 'none';
    document.documentElement.appendChild(host);
  }

  let shadow = host.shadowRoot;
  if (!shadow) {
    shadow = host.attachShadow({ mode: 'open' });
  }

  const toast = document.createElement('div');
  const bg = type === 'success' ? '#0F172A' : type === 'error' ? '#991B1B' : '#1E293B';
  const border = type === 'success' ? '#3B82F6' : type === 'error' ? '#EF4444' : '#64748B';

  toast.innerHTML = `
    <style>
      .toast {
        background-color: ${bg};
        border-left: 4px solid ${border};
        color: #F8FAFC;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        padding: 12px 18px;
        border-radius: 6px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
        margin-bottom: 10px;
        font-size: 13px;
        line-height: 1.4;
        min-width: 240px;
        max-width: 360px;
        pointer-events: auto;
        opacity: 0;
        transform: translateY(-8px);
        transition: opacity 0.2s ease, transform 0.2s ease;
      }
      .toast.visible {
        opacity: 1;
        transform: translateY(0);
      }
      .title {
        font-weight: 600;
        color: #FFFFFF;
        margin-bottom: 2px;
      }
      .desc {
        color: #94A3B8;
        font-size: 12px;
      }
    </style>
    <div class="toast">
      <div class="title">${title}</div>
      <div class="desc">${message}</div>
    </div>
  `;

  shadow.appendChild(toast);
  const toastEl = toast.querySelector('.toast');

  requestAnimationFrame(() => {
    toastEl?.classList.add('visible');
  });

  setTimeout(() => {
    toastEl?.classList.remove('visible');
    setTimeout(() => {
      toast.remove();
      if (shadow?.childNodes.length === 0) {
        host?.remove();
      }
    }, 250);
  }, 3200);
}

