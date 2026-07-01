const test = require('node:test');
const assert = require('node:assert/strict');

function createMockDom() {
  const elements = new Map();

  function createElement(id) {
    const element = {
      id,
      value: '',
      innerHTML: '',
      className: '',
      disabled: false,
      checked: false,
      children: [],
      style: {},
      classList: {
        add(name) {
          this._set.add(name);
        },
        remove(name) {
          this._set.delete(name);
        },
        toggle(name, force) {
          const has = this.contains(name);
          if (force === undefined) {
            if (has) {
              this.remove(name);
            } else {
              this.add(name);
            }
            return !has;
          }
          if (force) {
            this.add(name);
            return true;
          }
          this.remove(name);
          return false;
        },
        contains(name) {
          return this._set.has(name);
        },
        _set: new Set()
      },
      listeners: {},
      addEventListener(event, handler) {
        this.listeners[event] = handler;
      },
      dispatchEvent(event) {
        if (this.listeners[event]) {
          this.listeners[event]({ type: event });
        }
      },
      appendChild(child) {
        this.children.push(child);
      },
      reset() {}
    };
    elements.set(id, element);
    return element;
  }

  const document = {
    createElement(tagName) {
      return createElement(tagName);
    },
    getElementById(id) {
      if (!elements.has(id)) {
        return createElement(id);
      }
      return elements.get(id);
    },
    addEventListener() {}
  };

  const window = {};
  global.document = document;
  global.window = window;
  global.HTMLElement = function () {};

  return { document, window, elements };
}

test('toggleAuth hides headers and auth fields when authentication is not required', () => {
  const { document } = createMockDom();
  document.getElementById('authRequired');
  document.getElementById('authSection');
  document.getElementById('headersSection');
  document.getElementById('authFields');
  document.getElementById('apiAuthType');

  const app = require('../static/js/app.js');

  const authRequired = document.getElementById('authRequired');
  const authSection = document.getElementById('authSection');
  const headersSection = document.getElementById('headersSection');
  const authFields = document.getElementById('authFields');
  const apiAuthType = document.getElementById('apiAuthType');

  authRequired.checked = false;
  apiAuthType.value = 'bearer';

  app.toggleAuth();

  assert.equal(authSection.classList.contains('hidden'), true);
  assert.equal(headersSection.classList.contains('hidden'), true);
  assert.equal(authFields.innerHTML, '');
  assert.equal(apiAuthType.value, 'none');
});

test('appendAssistant renders a Generated SQL button for previewing', () => {
  const { document } = createMockDom();
  document.getElementById('chatBox');
  const app = require('../static/js/app.js');

  app.appendAssistant('SELECT 1', 'Reasoning', 1);

  function findByText(node, text) {
    if (!node || typeof node !== 'object') return null;
    if (node.textContent === text) return node;
    for (const child of node.children || []) {
      const found = findByText(child, text);
      if (found) return found;
    }
    return null;
  }

  const button = findByText(document.getElementById('chatBox'), 'Generated SQL');
  assert.ok(button);
});

test('appendAssistant shows preview JSON below the SQL in the chat bubble', async () => {
  const { document } = createMockDom();
  document.getElementById('chatBox');
  document.getElementById('apiPreview');
  document.getElementById('apiImportStatus');

  const app = require('../static/js/app.js');
  global.fetch = async () => ({
    json: async () => ({ success: true, format: 'json', preview: [{ id: 1 }] })
  });
  globalThis.apiConfigs = [{ id: 'cfg-1', name: 'Test API' }];

  app.appendAssistant('SELECT 1', 'Reasoning', 1);

  function findByClass(node, className) {
    if (!node || typeof node !== 'object') return null;
    if (node.className === className) return node;
    for (const child of node.children || []) {
      const found = findByClass(child, className);
      if (found) return found;
    }
    return null;
  }

  const previewContainer = findByClass(document.getElementById('chatBox'), 'preview-result');
  await app.previewSqlWithApi('SELECT 1', 'cfg-1', previewContainer);
  await Promise.resolve();
  await Promise.resolve();

  assert.ok(previewContainer);
  assert.match(previewContainer.innerHTML || '', /\[\s*\{\s*"id"/);
});

test('previewSqlWithApi sends generated SQL to the preview endpoint', async () => {
  const { document } = createMockDom();
  document.getElementById('apiPreview');
  document.getElementById('apiImportStatus');

  const app = require('../static/js/app.js');
  let request;

  global.fetch = async (url, options) => {
    request = { url, options };
    return { json: async () => ({ success: true, format: 'json', preview: [{ id: 1 }] }) };
  };

  globalThis.apiConfigs = [{ id: 'cfg-1', name: 'Test API' }];
  await app.previewSqlWithApi('SELECT 1', 'cfg-1');
  await Promise.resolve();

  assert.equal(request.url, '/api-configs/cfg-1/preview');
  assert.equal(request.options.method, 'POST');
  assert.deepEqual(JSON.parse(request.options.body), { query: 'SELECT 1' });
});
