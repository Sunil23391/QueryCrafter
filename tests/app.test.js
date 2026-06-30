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
      addEventListener() {},
      appendChild() {},
      reset() {}
    };
    elements.set(id, element);
    return element;
  }

  const document = {
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
  const { document, elements } = createMockDom();
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
