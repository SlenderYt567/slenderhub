import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { JSDOM } from 'jsdom';

test('product forms: delayed auth, direct edit, preserved draft, and guarded save', async t => {
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
    plugins: [{ name: 'store-fixture', setup(build) {
      build.onResolve({ filter: /^\.\.\/store$/ }, () => ({ path: 'store', namespace: 'fixture' }));
      build.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export const useStore = () => globalThis.__formStore;' }));
    } }],
  });
  const { default: ProductForm } = await import(pathToFileURL(outfile).href);
  const original = { id: 'direct', title: 'Original', description: 'Description', price: 2.5, category: 'item', stock: 10, image: 'product.png', featured: true, variants: [{ id: 'v1', name: 'Variant', price: 2.5, image: 'variant.png' }] };
  let resolveLoad, resolveSave;
  let loads = 0, saves = [];
  globalThis.__formStore = {
    products: [], authReady: false, isAdmin: false, exchangeRate: 5,
    getProductDetail: () => { loads++; return new Promise(resolve => { resolveLoad = resolve; }); },
    updateProduct: value => { saves.push(value); return new Promise(resolve => { resolveSave = resolve; }); },
    addProduct: value => { saves.push(value); return Promise.resolve(false); },
  };
  const container = document.getElementById('app');
  let root = createRoot(container);
  t.after(async () => { await act(async () => root.unmount()); dom.window.close(); delete globalThis.__formStore; });
  const render = mode => act(async () => root.render(React.createElement(MemoryRouter, { initialEntries: [mode === 'edit' ? '/edit/direct' : '/admin'] },
    React.createElement(Routes, null,
      React.createElement(Route, { path: '/edit/:id', element: React.createElement(ProductForm, { mode: 'edit' }) }),
      React.createElement(Route, { path: '/admin', element: React.createElement(ProductForm, { mode: 'create' }) }),
      React.createElement(Route, { path: '/login', element: React.createElement('p', null, 'LOGIN') }),
      React.createElement(Route, { path: '/', element: React.createElement('p', null, 'HOME') }),
    ))));
  const fill = async (element, value) => act(async () => {
    const proto = element.tagName === 'TEXTAREA' ? dom.window.HTMLTextAreaElement.prototype : dom.window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(element, value);
    element.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
  const submit = () => act(async () => container.querySelector('form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));

  await render('edit');
  assert.match(container.textContent, /Carregando produto/);
  assert.equal(loads, 0);
  __formStore.authReady = true;
  __formStore.isAdmin = true;
  await render('edit');
  assert.equal(loads, 1);
  await act(async () => resolveLoad(original));
  assert.equal(container.querySelector('input[type="text"]').value, 'Original');
  await fill(container.querySelector('input[type="text"]'), 'Edited draft');
  __formStore.products = [{ ...original, title: 'Background refresh' }];
  await render('edit');
  assert.equal(container.querySelector('input[type="text"]').value, 'Edited draft');
  assert.equal(loads, 1);
  await submit();
  await submit();
  assert.equal(saves.length, 1);
  assert.equal(saves[0].title, 'Edited draft');
  assert.equal(saves[0].featured, true);
  assert.equal(saves[0].variants[0].image, 'variant.png');
  await act(async () => resolveSave(false));
  assert.match(container.querySelector('[role="alert"]').textContent, /dados foram mantidos/);
  assert.equal(container.querySelector('input[type="text"]').value, 'Edited draft');

  await act(async () => root.unmount());
  root = createRoot(container);
  saves = [];
  await render('create');
  await fill(container.querySelector('input[type="text"]'), 'New product');
  await fill(container.querySelector('textarea'), 'New description');
  const numbers = [...container.querySelectorAll('input[type="number"]')];
  await fill(numbers.find(input => input.required && !input.disabled && input.step === '0.01'), '12.50');
  await fill(numbers.find(input => input.required && input.step === '1'), '3');
  await fill(container.querySelector('input[placeholder="Variant Name"]'), 'Unfinished variant');
  await submit();
  assert.equal(saves.length, 0);
  assert.match(container.querySelector('[role="alert"]').textContent, /variante em edição/);
  await act(async () => [...container.querySelectorAll('button')].find(button => button.textContent === 'Cancelar').click());
  await submit();
  assert.equal(saves.length, 1);
  assert.equal(saves[0].price, 12.5);
  assert.equal(saves[0].stock, 3);
});
