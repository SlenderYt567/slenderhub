import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { JSDOM } from 'jsdom';

test('product form waits for admin auth, preserves edited values, and prevents duplicate saves', async t => {
  const dom = new JSDOM('<!doctype html><div id="app"></div>', { url: 'http://localhost/' });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const React = await import('react');
  const { act } = React;
  const { createRoot } = await import('react-dom/client');
  const { MemoryRouter, Routes, Route } = await import('react-router-dom');
  const outfile = path.resolve('tests/.generated/product-form.mjs');
  await build({
    entryPoints: ['components/ProductForm.tsx'], outfile, bundle: true, platform: 'node', format: 'esm',
    external: ['react', 'react/*', 'react-router-dom', 'lucide-react'],
    plugins: [{ name: 'form-fixture', setup(build) {
      build.onResolve({ filter: /^\.\.\/store$/ }, () => ({ path: 'store', namespace: 'fixture' }));
      build.onLoad({ filter: /^store$/, namespace: 'fixture' }, () => ({ contents: 'export const useStore = () => globalThis.__formStore;' }));
      build.onResolve({ filter: /supabaseClient$/ }, () => ({ path: 'supabaseClient', namespace: 'fixture' }));
      build.onLoad({ filter: /^supabaseClient$/, namespace: 'fixture' }, () => ({ contents: 'const q={select:()=>q,order:()=>q,then:f=>Promise.resolve({data:[],error:null}).then(f)}; export const supabase={from:()=>q};' }));
    } }],
  });
  const { default: ProductForm } = await import(pathToFileURL(outfile).href);
  const original = { id: 'direct', title: 'Original', description: 'Description', short_description: 'Short', price: 2.5, category: 'Pets', game_name: 'Tap Simulator Reborn', stock: 10, image: 'product.png', featured: true, variants: [{ id: 'v1', name: 'Variant', price: 2.5, stock: 3, image: 'variant.png' }] };
  let resolveLoad, resolveSave;
  let loads = 0;
  const saves = [];
  const toasts = [];
  globalThis.__formStore = {
    products: [], authReady: false, isAdmin: false, exchangeRate: 5,
    showToast: (...args) => toasts.push(args),
    getProductDetail: () => { loads++; return new Promise(resolve => { resolveLoad = resolve; }); },
    updateProduct: value => { saves.push(value); return new Promise(resolve => { resolveSave = resolve; }); },
    addProduct: () => Promise.resolve(false),
  };
  const container = document.getElementById('app');
  const root = createRoot(container);
  t.after(async () => { await act(async () => root.unmount()); dom.window.close(); delete globalThis.__formStore; });
  const render = () => act(async () => root.render(React.createElement(MemoryRouter, { initialEntries: ['/edit/direct'] },
    React.createElement(Routes, null,
      React.createElement(Route, { path: '/edit/:id', element: React.createElement(ProductForm, { mode: 'edit' }) }),
      React.createElement(Route, { path: '/login', element: React.createElement('p', null, 'LOGIN') }),
    ))));
  const fill = async (element, value) => act(async () => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(element, value);
    element.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });

  await render();
  assert.match(container.textContent, /Carregando produto/);
  assert.equal(loads, 0);
  __formStore.authReady = true;
  __formStore.isAdmin = true;
  await render();
  assert.equal(loads, 1);
  await act(async () => resolveLoad(original));
  const title = container.querySelector('input[placeholder^="Huge Fire Dragon"]');
  assert.equal(title.value, 'Original');
  await fill(title, 'Edited draft');
  __formStore.products = [{ ...original, title: 'Background refresh' }];
  await render();
  assert.equal(title.value, 'Edited draft');
  assert.equal(loads, 1);
  const save = [...container.querySelectorAll('button')].find(button => button.textContent.includes('Salvar Alterações'));
  assert.ok(save);
  await act(async () => { save.click(); save.click(); });
  assert.equal(saves.length, 1);
  assert.equal(saves[0].title, 'Edited draft');
  assert.equal(saves[0].variants[0].image, 'variant.png');
  await act(async () => resolveSave(false));
  assert.equal(title.value, 'Edited draft');
  assert.ok(toasts.some(([message, type]) => type === 'error' && message.includes('banco')));
});
