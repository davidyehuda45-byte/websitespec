/**
 * Dynamically injects content script into a tab if it was opened before the extension was loaded.
 * Supports both MV3 (chrome.scripting.executeScript) and MV2 (browser.tabs.executeScript).
 */
export async function injectContentScript(tabId: number): Promise<boolean> {
  try {
    const b = (globalThis as any).browser || (globalThis as any).chrome;
    if (b?.scripting?.executeScript) {
      await b.scripting.executeScript({
        target: { tabId },
        files: ['content-scripts/content.js'],
      });
      return true;
    } else if (b?.tabs?.executeScript) {
      await b.tabs.executeScript(tabId, { file: 'content-scripts/content.js' });
      return true;
    }
  } catch (err) {
    console.warn('Injeksi skrip on-demand gagal:', err);
  }
  return false;
}
