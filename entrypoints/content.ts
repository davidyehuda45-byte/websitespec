import { extractPageBlueprint } from '../src/core/extract/page';
import { showBlueprintToast } from '../src/core/ui/toast';

declare global {
  interface Window {
    __blueprintLastRightClicked?: Element | null;
  }
}

export default defineContentScript({
  matches: ['*://*/*'],
  main() {
    // Track the last right-clicked element for Component Mode extraction (F-04)
    document.addEventListener(
      'contextmenu',
      (event) => {
        window.__blueprintLastRightClicked = event.target as Element;
      },
      true
    );

    const b = (globalThis as any).browser || (globalThis as any).chrome;

    // Listen for extraction requests from background service worker or popup
    b.runtime.onMessage.addListener((message: any, _sender: any, sendResponse?: (res: any) => void) => {
      // 1. Healthcheck Handshake
      if (message.type === 'PING') {
        if (sendResponse) sendResponse({ pong: true });
        return Promise.resolve({ pong: true });
      }

      // 2. Full Page Extraction
      if (message.type === 'EXTRACT_PAGE') {
        try {
          const blueprint = extractPageBlueprint();
          showBlueprintToast('Halaman Disimpan', `Berhasil mengekstrak ${blueprint.pathname}`);
          if (sendResponse) sendResponse({ success: true, blueprint });
          return Promise.resolve({ success: true, blueprint });
        } catch (error: any) {
          console.error('Ekstraksi halaman gagal:', error);
          const errMsg = error?.stack || error?.message || String(error);
          showBlueprintToast('Ekstraksi Gagal', String(error?.message || error), 'error');
          if (sendResponse) sendResponse({ success: false, error: errMsg });
          return Promise.resolve({ success: false, error: errMsg });
        }
      }

      // 3. Component Extraction
      if (message.type === 'EXTRACT_COMPONENT') {
        try {
          const targetEl = window.__blueprintLastRightClicked || document.body;
          const blueprint = extractPageBlueprint(targetEl);
          showBlueprintToast(
            'Komponen Disimpan',
            `Berhasil mengekstrak <${(targetEl?.tagName || 'element').toLowerCase()}> ke Blueprint`
          );
          if (sendResponse) sendResponse({ success: true, blueprint });
          return Promise.resolve({ success: true, blueprint });
        } catch (error: any) {
          console.error('Ekstraksi komponen gagal:', error);
          const errMsg = error?.stack || error?.message || String(error);
          showBlueprintToast('Ekstraksi Gagal', String(error?.message || error), 'error');
          if (sendResponse) sendResponse({ success: false, error: errMsg });
          return Promise.resolve({ success: false, error: errMsg });
        }
      }

      // 4. Toast notifications
      if (message.type === 'SHOW_TOAST') {
        showBlueprintToast(message.title, message.message, message.toastType || 'info');
        if (sendResponse) sendResponse({ success: true });
        return Promise.resolve({ success: true });
      }

      return false;
    });
  },
});
