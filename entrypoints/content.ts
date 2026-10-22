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
      if (message.type === 'EXTRACT_PAGE') {
        try {
          const blueprint = extractPageBlueprint();
          showBlueprintToast('Halaman Disimpan', `Berhasil mengekstrak ${blueprint.pathname}`);
          if (sendResponse) sendResponse({ success: true, blueprint });
          return Promise.resolve({ success: true, blueprint });
        } catch (error) {
          showBlueprintToast('Ekstraksi Gagal', String(error), 'error');
          if (sendResponse) sendResponse({ success: false, error: String(error) });
          return Promise.resolve({ success: false, error: String(error) });
        }
      }

      if (message.type === 'EXTRACT_COMPONENT') {
        try {
          const targetEl = window.__blueprintLastRightClicked || document.body;
          const blueprint = extractPageBlueprint(targetEl);
          showBlueprintToast(
            'Komponen Disimpan',
            `Berhasil mengekstrak <${targetEl.tagName.toLowerCase()}> ke Blueprint`
          );
          if (sendResponse) sendResponse({ success: true, blueprint });
          return Promise.resolve({ success: true, blueprint });
        } catch (error) {
          showBlueprintToast('Ekstraksi Gagal', String(error), 'error');
          if (sendResponse) sendResponse({ success: false, error: String(error) });
          return Promise.resolve({ success: false, error: String(error) });
        }
      }

      if (message.type === 'SHOW_TOAST') {
        showBlueprintToast(message.title, message.message, message.toastType || 'info');
        if (sendResponse) sendResponse({ success: true });
        return Promise.resolve({ success: true });
      }

      return false;
    });
  },
});
