import { savePageToCart, clearCart, buildProjectBlueprint, getCartPages, updateBadge } from '../src/core/storage/cart';
import { ensureContentScriptReady } from '../src/core/utils/inject';
import { compileBlueprintToMarkdown } from '../src/core/compile/markdown';
import { compileBlueprintToZip } from '../src/core/compile/zip';

export default defineBackground(() => {
  const api = (globalThis as any).browser || (globalThis as any).chrome;
  const menus = api?.menus || api?.contextMenus;
  const actionCtx = api?.action ? 'action' : 'browser_action';

  // Safe Context Menu Setup on installation / update
  api.runtime.onInstalled.addListener(async (details: any) => {
    // Only reset cart on fresh installation, NEVER on extension update (Fixes PRD 11.1 #2)
    if (details.reason === 'install') {
      await clearCart();
    } else {
      const pages = await getCartPages();
      await updateBadge(pages.length);
    }

    if (menus) {
      menus.removeAll(() => {
        menus.create({
          id: 'menu-add-page',
          title: '1. Tambahkan halaman ke Blueprint',
          contexts: ['page', actionCtx],
        });

        menus.create({
          id: 'menu-add-component',
          title: '2. Mode Komponen (Pilih elemen ini)',
          contexts: ['all'],
        });

        menus.create({
          id: 'menu-separator',
          type: 'separator',
          contexts: ['page', actionCtx],
        });

        menus.create({
          id: 'menu-download-md',
          title: '3. Download Blueprint (.md)',
          contexts: ['page', actionCtx],
        });

        menus.create({
          id: 'menu-download-zip',
          title: '4. Download Paket (.zip)',
          contexts: ['page', actionCtx],
        });

        menus.create({
          id: 'menu-reset-cart',
          title: '5. Reset keranjang',
          contexts: ['page', actionCtx],
        });
      });
    }
  });

  // Handle Context Menu clicks
  menus?.onClicked.addListener(async (info: any, tab: any) => {
    if (!tab || !tab.id) return;

    // Check for restricted URLs (Fixes PRD 11.1 #9)
    if (
      tab.url?.startsWith('chrome://') ||
      tab.url?.startsWith('chrome-extension://') ||
      tab.url?.startsWith('edge://') ||
      tab.url?.startsWith('about:')
    ) {
      console.warn('Ekstraksi tidak diizinkan pada halaman sistem browser.');
      return;
    }

    if (info.menuItemId === 'menu-add-page' || info.menuItemId === 'menu-add-component') {
      const actionType = info.menuItemId === 'menu-add-component' ? 'EXTRACT_COMPONENT' : 'EXTRACT_PAGE';
      const b = (globalThis as any).browser || (globalThis as any).chrome;

      try {
        await ensureContentScriptReady(tab.id);
        const response = await b.tabs.sendMessage(tab.id, { type: actionType });

        if (response && response.success && response.blueprint) {
          await savePageToCart(response.blueprint);
        }
      } catch (err) {
        console.error('Content script communication failed:', err);
      }
    } else if (info.menuItemId === 'menu-download-md') {
      await triggerMarkdownDownload();
    } else if (info.menuItemId === 'menu-download-zip') {
      await triggerZipDownload();
    } else if (info.menuItemId === 'menu-reset-cart') {
      await clearCart();
    }
  });

  // Helper: Trigger .md download
  async function triggerMarkdownDownload() {
    const project = await buildProjectBlueprint();
    if (project.pages.length === 0) {
      console.warn('Keranjang kosong. Tambahkan halaman terlebih dahulu.');
      return;
    }

    const markdown = compileBlueprintToMarkdown(project);
    const dateStr = new Date().toISOString().split('T')[0];
    const safeDomain = project.domain.replace(/[^a-z0-9.-]/gi, '_');
    const filename = `blueprint-${safeDomain}-${dateStr}.md`;

    const dataUrl = `data:text/markdown;charset=utf-8,${encodeURIComponent(markdown)}`;
    await api.downloads.download({
      url: dataUrl,
      filename,
      saveAs: true,
    });
  }

  // Helper: Trigger .zip download
  async function triggerZipDownload() {
    const project = await buildProjectBlueprint();
    if (project.pages.length === 0) {
      console.warn('Keranjang kosong. Tambahkan halaman terlebih dahulu.');
      return;
    }

    const zipBlob = await compileBlueprintToZip(project);
    const dateStr = new Date().toISOString().split('T')[0];
    const safeDomain = project.domain.replace(/[^a-z0-9.-]/gi, '_');
    const filename = `blueprint-${safeDomain}-${dateStr}.zip`;

    // Convert blob to base64 data url for downloads API
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Url = reader.result as string;
      await api.downloads.download({
        url: base64Url,
        filename,
        saveAs: true,
      });
    };
    reader.readAsDataURL(zipBlob);
  }
});
