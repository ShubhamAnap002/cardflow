/**
 * Web implementation of feedback (toasts and confirms).
 */

let toastTimeout: ReturnType<typeof setTimeout> | null = null;

export function notify(message: string) {
  if (typeof document === 'undefined') return;

  let container = document.getElementById('cardflow-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'cardflow-toast-container';
    container.style.position = 'fixed';
    container.style.bottom = '24px';
    container.style.left = '50%';
    container.style.transform = 'translateX(-50%)';
    container.style.zIndex = '99999';
    container.style.pointerEvents = 'none';
    container.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
    document.body.appendChild(container);
  }

  container.innerHTML = `
    <div style="
      background: #0F172A;
      color: #FFFFFF;
      padding: 10px 18px;
      border-radius: 999px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
      display: flex;
      align-items: center;
      gap: 8px;
      max-width: 90vw;
      text-align: center;
    ">
      ${escapeHtml(message)}
    </div>
  `;

  container.style.opacity = '1';
  container.style.transform = 'translateX(-50%) translateY(0)';

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    if (container) {
      container.style.opacity = '0';
      container.style.transform = 'translateX(-50%) translateY(10px)';
    }
  }, 2800);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function confirm(
  title: string,
  message: string,
  _confirmLabel: string,
  onConfirm: () => void
) {
  if (typeof window === 'undefined') return;
  const ok = window.confirm(`${title}\n\n${message}`);
  if (ok) {
    onConfirm();
  }
}
