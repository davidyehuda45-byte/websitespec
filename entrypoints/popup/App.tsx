import React, { useEffect, useState } from 'react';
import {
  FileText,
  Archive,
  Copy,
  Trash2,
  PlusCircle,
  RotateCcw,
  Layers,
  Code2,
  Check,
  ExternalLink,
} from 'lucide-react';
import type { PageBlueprint, ProjectBlueprint } from '../../src/types/blueprint';
import {
  getCartPages,
  removePageFromCart,
  clearCart,
  getTargetStack,
  setTargetStack,
  getOutputProfile,
  setOutputProfile,
  buildProjectBlueprint,
  savePageToCart,
} from '../../src/core/storage/cart';
import { injectContentScript } from '../../src/core/utils/inject';
import { compileBlueprintToMarkdown } from '../../src/core/compile/markdown';
import { compileBlueprintToZip } from '../../src/core/compile/zip';
import './App.css';

const TARGET_STACK_OPTIONS = [
  { value: '', label: 'Auto-detect (Ikuti Framework Asli)' },
  { value: 'Next.js 15 (App Router) + Tailwind CSS', label: 'Next.js 15 + Tailwind CSS' },
  { value: 'React + Vite + Tailwind CSS', label: 'React + Vite + Tailwind CSS' },
  { value: 'Laravel 11 + Blade + Tailwind CSS', label: 'Laravel 11 (Blade) + Tailwind' },
  { value: 'Laravel 11 + Livewire + Tailwind CSS', label: 'Laravel 11 (Livewire)' },
  { value: 'Laravel 11 + Inertia.js (React) + Tailwind', label: 'Laravel 11 (Inertia + React)' },
  { value: 'Vue 3 + Vite + Tailwind CSS', label: 'Vue 3 + Vite + Tailwind CSS' },
  { value: 'SvelteKit + Tailwind CSS', label: 'SvelteKit + Tailwind CSS' },
  { value: 'Flutter (Mobile & Web)', label: 'Flutter' },
  { value: 'HTML5 + CSS Murni (Tanpa Framework)', label: 'HTML5 + CSS Murni' },
];

export default function App() {
  const [pages, setPages] = useState<PageBlueprint[]>([]);
  const [targetStack, setTargetStackState] = useState<string>('');
  const [outputProfile, setOutputProfileState] = useState<'compact' | 'full'>('compact');
  const [copied, setCopied] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  useEffect(() => {
    loadData();

    // Listen to storage changes to update UI in real-time
    const api = (globalThis as any).browser || (globalThis as any).chrome;
    const handleStorageChange = (changes: Record<string, any>) => {
      const pageChange = changes.blueprint_cart_pages;
      if (pageChange) {
        setPages((pageChange.newValue as PageBlueprint[]) || []);
      }
    };
    api.storage.onChanged.addListener(handleStorageChange);
    return () => api.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  async function loadData() {
    const loadedPages = await getCartPages();
    const loadedStack = await getTargetStack();
    const loadedProfile = await getOutputProfile();
    setPages(loadedPages);
    setTargetStackState(loadedStack);
    setOutputProfileState(loadedProfile);
  }

  async function handleTargetStackChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    setTargetStackState(val);
    await setTargetStack(val);
  }

  async function handleOutputProfileChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value as 'compact' | 'full';
    setOutputProfileState(val);
    await setOutputProfile(val);
  }

  async function handleExtractActiveTab() {
    setLoading(true);
    setStatusMessage('');
    try {
      const b = (globalThis as any).browser || (globalThis as any).chrome;

      // Query active tab (support both currentWindow and lastFocusedWindow for Firefox)
      let tabs = await b.tabs.query({ active: true, currentWindow: true });
      if (!tabs || tabs.length === 0) {
        tabs = await b.tabs.query({ active: true, lastFocusedWindow: true });
      }

      const tab = tabs?.[0];
      if (!tab || !tab.id) {
        setStatusMessage('Tab aktif tidak ditemukan');
        return;
      }

      if (
        tab.url?.startsWith('about:') ||
        tab.url?.startsWith('chrome://') ||
        tab.url?.startsWith('edge://') ||
        tab.url?.startsWith('moz-extension://')
      ) {
        setStatusMessage('Tidak dapat mengekstrak halaman sistem browser.');
        return;
      }

      let response;
      try {
        response = await b.tabs.sendMessage(tab.id, { type: 'EXTRACT_PAGE' });
      } catch (err1) {
        console.warn('Percobaan pertama sendMessage gagal, mencoba injeksi skrip...', err1);
        // Tab opened before extension load: inject on-demand and retry
        await injectContentScript(tab.id);
        await new Promise((r) => setTimeout(r, 300));
        try {
          response = await b.tabs.sendMessage(tab.id, { type: 'EXTRACT_PAGE' });
        } catch (err2: any) {
          console.error('Percobaan kedua sendMessage gagal:', err2);
          setStatusMessage('Gagal komunikasi: ' + (err2?.message || String(err2)));
          return;
        }
      }

      if (response && response.success && response.blueprint) {
        await savePageToCart(response.blueprint);
        setStatusMessage('Halaman berhasil ditambahkan ke keranjang!');
      } else {
        setStatusMessage(response?.error || 'Gagal mengekstrak halaman');
      }
    } catch (err: any) {
      console.error('Error saat ekstraksi:', err);
      setStatusMessage('Gagal: ' + (err?.message || String(err)));
    } finally {
      setLoading(false);
      setTimeout(() => setStatusMessage(''), 5000);
    }
  }

  async function handleDeletePage(pathname: string) {
    await removePageFromCart(pathname);
  }

  async function handleClearCart() {
    if (confirm('Kosongkan semua halaman dari keranjang blueprint?')) {
      await clearCart();
    }
  }

  async function handleDownloadMd() {
    setLoading(true);
    try {
      const project: ProjectBlueprint = await buildProjectBlueprint();
      if (project.pages.length === 0) return;

      const markdown = compileBlueprintToMarkdown(project);
      const dateStr = new Date().toISOString().split('T')[0];
      const safeDomain = project.domain.replace(/[^a-z0-9.-]/gi, '_');
      const filename = `blueprint-${safeDomain}-${dateStr}.md`;

      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadZip() {
    setLoading(true);
    try {
      const project: ProjectBlueprint = await buildProjectBlueprint();
      if (project.pages.length === 0) return;

      const zipBlob = await compileBlueprintToZip(project);
      const dateStr = new Date().toISOString().split('T')[0];
      const safeDomain = project.domain.replace(/[^a-z0-9.-]/gi, '_');
      const filename = `blueprint-${safeDomain}-${dateStr}.zip`;

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyToClipboard() {
    const project: ProjectBlueprint = await buildProjectBlueprint();
    if (project.pages.length === 0) return;

    const markdown = compileBlueprintToMarkdown(project);
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="popup-container">
      {/* Header */}
      <header className="popup-header">
        <div className="header-brand">
          <Layers className="brand-icon" size={20} />
          <h1 className="brand-title">Blueprint Extractor</h1>
        </div>
        <span className="page-counter-badge">{pages.length} Halaman</span>
      </header>

      {/* Status Alert */}
      {statusMessage && <div className="status-banner">{statusMessage}</div>}

      {/* Main Action Bar */}
      <div className="capture-bar">
        <button
          className="btn btn-primary btn-block"
          onClick={handleExtractActiveTab}
          disabled={loading}
        >
          <PlusCircle size={16} />
          <span>{loading ? 'Mengekstrak Halaman...' : 'Tambahkan Halaman Aktif'}</span>
        </button>
      </div>

      {/* Configuration Section */}
      <section className="config-section">
        <div className="config-item">
          <label className="config-label">
            <Code2 size={14} />
            <span>Target Stack Override</span>
          </label>
          <select
            className="config-select"
            value={targetStack}
            onChange={handleTargetStackChange}
          >
            {TARGET_STACK_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Cart Page List */}
      <section className="cart-section">
        <div className="cart-header">
          <span className="cart-title">Daftar Halaman di Keranjang</span>
          {pages.length > 0 && (
            <button className="btn-text-danger" onClick={handleClearCart}>
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>

        {pages.length === 0 ? (
          <div className="empty-cart">
            <p className="empty-title">Keranjang Blueprint Masih Kosong</p>
            <p className="empty-desc">
              Buka website referensi lalu klik tombol di atas atau klik kanan &gt; "1. Tambahkan halaman ke Blueprint".
            </p>
          </div>
        ) : (
          <div className="page-list">
            {pages.map((p) => (
              <div key={p.pathname} className="page-card">
                <div className="page-info">
                  <div className="page-title-row">
                    <span className="page-title" title={p.title}>
                      {p.title}
                    </span>
                  </div>
                  <div className="page-meta">
                    <code className="page-path">{p.pathname}</code>
                    <span className="page-viewport">
                      {p.viewport.width}x{p.viewport.height}
                    </span>
                  </div>
                </div>
                <button
                  className="btn-icon-danger"
                  title="Hapus dari keranjang"
                  onClick={() => handleDeletePage(p.pathname)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Export Controls */}
      {pages.length > 0 && (
        <footer className="export-footer">
          <div className="export-actions">
            <button className="btn btn-secondary" onClick={handleDownloadMd} title="Unduh Markdown tunggal">
              <FileText size={15} />
              <span>Unduh .md</span>
            </button>
            <button className="btn btn-secondary" onClick={handleDownloadZip} title="Unduh paket Zip lengkap">
              <Archive size={15} />
              <span>Unduh .zip</span>
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleCopyToClipboard}
              title="Salin Markdown ke clipboard"
            >
              {copied ? <Check size={15} className="text-success" /> : <Copy size={15} />}
              <span>{copied ? 'Tersalin!' : 'Salin'}</span>
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
