import type { PageBlueprint, ProjectBlueprint } from '../../types/blueprint';
import { extractSharedLayouts } from '../compile/shared-layout';

const STORAGE_KEY_PAGES = 'blueprint_cart_pages';
const STORAGE_KEY_TARGET_STACK = 'blueprint_target_stack';
const STORAGE_KEY_OUTPUT_PROFILE = 'blueprint_output_profile';

function getApi() {
  return (globalThis as any).browser || (globalThis as any).chrome;
}

export async function getCartPages(): Promise<PageBlueprint[]> {
  const api = getApi();
  const result = await api.storage.local.get(STORAGE_KEY_PAGES);
  return (result[STORAGE_KEY_PAGES] as PageBlueprint[]) || [];
}

export async function savePageToCart(page: PageBlueprint): Promise<number> {
  const pages = await getCartPages();
  // M-04: Replace existing page if same pathname, otherwise append
  const index = pages.findIndex((p) => p.pathname === page.pathname);
  if (index >= 0) {
    pages[index] = page;
  } else {
    pages.push(page);
  }

  const api = getApi();
  await api.storage.local.set({ [STORAGE_KEY_PAGES]: pages });
  await updateBadge(pages.length);
  return pages.length;
}

export async function removePageFromCart(pathname: string): Promise<number> {
  const pages = await getCartPages();
  const updated = pages.filter((p) => p.pathname !== pathname);
  const api = getApi();
  await api.storage.local.set({ [STORAGE_KEY_PAGES]: updated });
  await updateBadge(updated.length);
  return updated.length;
}

export async function clearCart(): Promise<void> {
  const api = getApi();
  await api.storage.local.remove(STORAGE_KEY_PAGES);
  await updateBadge(0);
}

export async function getTargetStack(): Promise<string> {
  const api = getApi();
  const result = await api.storage.local.get(STORAGE_KEY_TARGET_STACK);
  return (result[STORAGE_KEY_TARGET_STACK] as string) || '';
}

export async function setTargetStack(stack: string): Promise<void> {
  const api = getApi();
  await api.storage.local.set({ [STORAGE_KEY_TARGET_STACK]: stack });
}

export async function getOutputProfile(): Promise<'compact' | 'full'> {
  const api = getApi();
  const result = await api.storage.local.get(STORAGE_KEY_OUTPUT_PROFILE);
  return (result[STORAGE_KEY_OUTPUT_PROFILE] as 'compact' | 'full') || 'compact';
}

export async function setOutputProfile(profile: 'compact' | 'full'): Promise<void> {
  const api = getApi();
  await api.storage.local.set({ [STORAGE_KEY_OUTPUT_PROFILE]: profile });
}

export async function updateBadge(count: number): Promise<void> {
  try {
    const api = getApi();
    const act = api?.action || api?.browserAction;
    const text = count > 0 ? String(count) : '';
    if (act?.setBadgeText) {
      await act.setBadgeText({ text });
    }
    if (act?.setBadgeBackgroundColor) {
      await act.setBadgeBackgroundColor({ color: '#2563EB' });
    }
  } catch (err) {
    console.warn('Gagal memperbarui badge:', err);
  }
}

export async function buildProjectBlueprint(): Promise<ProjectBlueprint> {
  const pages = await getCartPages();
  const targetStack = await getTargetStack();
  const outputProfile = await getOutputProfile();

  let domain = 'localhost';
  const firstPage = pages[0];
  if (firstPage) {
    try {
      domain = new URL(firstPage.url).hostname;
    } catch {
      domain = 'website';
    }
  }

  const { sharedLayouts, updatedPages } = extractSharedLayouts(pages);

  return {
    domain,
    targetStack,
    outputProfile,
    pages: updatedPages,
    sharedLayouts,
    createdAt: new Date().toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
  };
}
