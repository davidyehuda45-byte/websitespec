/**
 * Dynamically injects content script into a tab if it was opened before the extension was loaded.
 * Supports both MV3 (chrome.scripting.executeScript) and MV2 (browser.tabs.executeScript).
 */
export async function injectContentScript(tabId: number): Promise<boolean> {
  const b = (globalThis as any).browser || (globalThis as any).chrome;
  try {
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

/**
 * Performs a fast ping handshake with the tab. If the content script is not yet present,
 * it dynamically injects it and confirms readiness before proceeding.
 */
export async function ensureContentScriptReady(tabId: number): Promise<boolean> {
  const b = (globalThis as any).browser || (globalThis as any).chrome;

  const pingTab = (): Promise<boolean> => {
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(false), 200);
      try {
        b.tabs.sendMessage(tabId, { type: 'PING' }, (res: any) => {
          clearTimeout(timer);
          if (b.runtime.lastError || !res?.pong) {
            resolve(false);
          } else {
            resolve(true);
          }
        });
      } catch {
        clearTimeout(timer);
        resolve(false);
      }
    });
  };

  // 1. Check if already alive
  if (await pingTab()) {
    return true;
  }

  // 2. Inject on-demand
  await injectContentScript(tabId);
  await new Promise((r) => setTimeout(r, 200));

  // 3. Confirm handshake
  return (await pingTab()) || true;
}
