/* global window, document, location, confirm, prompt, setTimeout, clearTimeout */
(function () {
  'use strict';

  var BM = window.BookManagement = window.BookManagement || {};
  var store = BM.store;

  function qs(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function qsa(selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  }

  function el(tag, props, children) {
    var node = document.createElement(tag);
    props = props || {};
    Object.keys(props).forEach(function (key) {
      var value = props[key];
      if (key === 'className') {
        node.className = value;
      } else if (key === 'text') {
        node.textContent = value;
      } else if (key === 'html') {
        node.innerHTML = value;
      } else if (key.indexOf('on') === 0 && typeof value === 'function') {
        node.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (typeof value !== 'undefined' && value !== null) {
        node.setAttribute(key, value);
      }
    });
    (children || []).forEach(function (child) {
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return node;
  }

  function clear(node) {
    if (!node) {
      return;
    }
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  function td(text) {
    if (typeof text === 'undefined' || text === null) {
      return el('td', { text: '' });
    }
    return el('td', { text: String(text) });
  }

  function button(text, className, handler) {
    return el('button', { type: 'button', className: className || 'btn', text: text, onclick: handler });
  }

  function page() {
    return (location.pathname.split('/').pop() || '').toLowerCase();
  }

  function value(id) {
    var node = qs('#' + id);
    return node ? node.value.trim() : '';
  }

  function setValue(id, val) {
    var node = qs('#' + id);
    if (node) {
      node.value = (typeof val === 'undefined' || val === null) ? '' : val;
    }
  }

  function toast(message, type) {
    if (!message) {
      return;
    }
    var box = qs('#bm-toast');
    if (!box) {
      box = el('div', { id: 'bm-toast' });
      document.body.appendChild(box);
    }
    box.textContent = message;
    box.style.position = 'fixed';
    box.style.right = '24px';
    box.style.top = '76px';
    box.style.zIndex = '9999';
    box.style.maxWidth = '360px';
    box.style.padding = '12px 16px';
    box.style.borderRadius = '4px';
    box.style.boxShadow = '0 4px 16px rgba(0,0,0,0.18)';
    box.style.background = type === 'error' ? '#f56c6c' : '#67c23a';
    box.style.color = '#fff';
    box.style.fontSize = '14px';
    box.style.opacity = '1';
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { box.style.opacity = '0'; }, 2600);
  }

  function handle(error) {
    toast(error && error.message ? error.message : String(error), 'error');
  }

  function empty(tbody, columns, message) {
    clear(tbody);
    var cell = td(message || 'No records found.');
    cell.colSpan = columns;
    cell.style.textAlign = 'center';
    cell.style.color = '#909399';
    var row = el('tr');
    row.appendChild(cell);
    tbody.appendChild(row);
  }

  function ensurePanel(parent, id, title) {
    var panel = qs('#' + id);
    if (panel) {
      return panel;
    }
    panel = el('div', { id: id, className: 'bm-panel' });
    panel.style.background = 'rgba(255,255,255,0.86)';
    panel.style.padding = '20px';
    panel.style.borderRadius = '4px';
    panel.style.margin = '20px auto';
    panel.style.maxWidth = '1200px';
    panel.style.boxSizing = 'border-box';
    if (title) {
      panel.appendChild(el('h2', { text: title }));
    }
    parent.appendChild(panel);
    return panel;
  }

  function readerType(value) {
    return { student: 'Student', teacher: 'Teacher', visitor: 'Visitor' }[value] || value || '';
  }

  function certified(value) {
    return value === 'yes' ? 'Verified' : 'Not Verified';
  }

  function resetButton() {
    if (BM.auth && !BM.auth.isAdmin()) {
      return;
    }
    var host = qs('.user-info p');
    if (!host || qs('#bm-reset-data')) {
      return;
    }
    var reset = button('Reset Data', 'bm-reset-btn', function () {
      if (!confirm('Reset all BookManagement localStorage data?')) {
        return;
      }
      store.reset();
      location.reload();
    });
    reset.id = 'bm-reset-data';
    reset.style.marginLeft = '8px';
    reset.style.backgroundColor = '#909399';
    reset.style.color = '#fff';
    reset.style.border = 'none';
    reset.style.borderRadius = '4px';
    reset.style.padding = '6px 12px';
    reset.style.cursor = 'pointer';
    host.appendChild(reset);
  }

  function pillClass(text, index) {
    return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function dashboardCell(value, index, rowKey) {
    var text = (typeof value === 'undefined' || value === null) ? '' : String(value);
    var cell = el('td');
    if (index === 0) {
      cell.textContent = text;
      return cell;
    }
    var isNumber = /^-?\d+(\.\d+)?$/.test(text);
    var isSingleWord = /^[A-Za-z]+$/.test(text);
    if (isNumber || isSingleWord) {
      cell.appendChild(el('span', {
        className: 'bm-cell-pill ' + (isNumber ? 'bm-cell-pill-number' : 'bm-cell-pill-word') + ' bm-cell-pill-row-' + rowKey + ' bm-cell-pill-col-' + index + ' bm-cell-pill-value-' + pillClass(text, index),
        text: text
      }));
      return cell;
    }
    cell.textContent = text;
    return cell;
  }

  function bookTableCell(value, index) {
    var text = (typeof value === 'undefined' || value === null) ? '' : String(value);
    var cell = el('td');
    var isNumber = /^-?\d+(\.\d+)?$/.test(text);
    var isSingleWord = /^[A-Za-z]+$/.test(text);
    if (isNumber || isSingleWord) {
      cell.appendChild(el('span', {
        className: 'bm-table-pill ' + (isNumber ? 'bm-table-pill-number' : 'bm-table-pill-word') + ' bm-table-pill-col-' + index + ' bm-table-pill-value-' + pillClass(text, index),
        text: text
      }));
      return cell;
    }
    cell.textContent = text;
    return cell;
  }

  function pillTd(value, index) {
    return bookTableCell(value, index || 0);
  }

  function dashboardBookFall() {
    if (qs('.bm-bookfall')) {
      return;
    }
    var layer = el('div', { className: 'bm-bookfall', 'aria-hidden': 'true' });
    for (var i = 0; i < 12; i += 1) {
      layer.appendChild(el('span', { className: 'bm-falling-book bm-falling-book-' + (i + 1) }));
    }
    document.body.appendChild(layer);
  }

  function iconSpec(text) {
    var key = String(text || '').toLowerCase();
    if (/delete|scrap|reset|removal/.test(key)) { return ['trash', 'red']; }
    if (/edit/.test(key)) { return ['pen', 'blue']; }
    if (/action|operation|tools/.test(key)) { return ['gear', 'orange']; }
    if (/rank|ranking|popular/.test(key)) { return ['trophy', 'gold']; }
    if (/recommended|recommendation/.test(key)) { return ['bookmark', 'violet']; }
    if (/records?|list/.test(key)) { return ['clipboard', 'slate']; }
    if (/status|certified|authentication/.test(key)) { return ['shield', 'mint']; }
    if (/reader id|reader number/.test(key)) { return ['idCard', 'cyan']; }
    if (/reader type/.test(key)) { return ['tag', 'mint']; }
    if (/id number/.test(key)) { return ['key', 'gold']; }
    if (/library card/.test(key)) { return ['card', 'cyan']; }
    if (/demand/.test(key)) { return ['trend', 'red']; }
    if (/can borrow|available|currently available|borrowable|verified/.test(key)) { return ['check', 'green']; }
    if (/overdue|urgent|alert|shortage/.test(key)) { return ['alert', 'red']; }
    if (/inventory|stock|quantity|copies|total|out/.test(key)) { return ['boxes', 'orange']; }
    if (/rate|analysis|stat|report|borrowing times|borrows|count/.test(key)) { return ['chart', 'orange']; }
    if (/due date|new due/.test(key)) { return ['clock', 'gold']; }
    if (/actual return|return date/.test(key)) { return ['arrowBack', 'teal']; }
    if (/reservation date/.test(key)) { return ['bookmark', 'violet']; }
    if (/borrow date|shelf date/.test(key)) { return ['calendar', 'teal']; }
    if (/renew/.test(key)) { return ['repeat', 'green']; }
    if (/return/.test(key)) { return ['arrowBack', 'teal']; }
    if (/reserve|reservation|queue/.test(key)) { return ['bookmark', 'violet']; }
    if (/borrow|loan/.test(key)) { return ['calendar', 'teal']; }
    if (/isbn|barcode/.test(key)) { return ['barcode', 'cyan']; }
    if (/publisher/.test(key)) { return ['building', 'amber']; }
    if (/location|storage|shelf/.test(key)) { return ['map', 'amber']; }
    if (/contact/.test(key)) { return ['phone', 'teal']; }
    if (/author/.test(key)) { return ['pen', 'violet']; }
    if (/reader|user|admin/.test(key)) { return ['user', 'violet']; }
    if (/record/.test(key)) { return ['clipboard', 'slate']; }
    if (/type|language|edition|category/.test(key)) { return ['tag', 'mint']; }
    if (/query|search|keyword/.test(key)) { return ['search', 'blue']; }
    if (/mode/.test(key)) { return ['sliders', 'violet']; }
    if (/method/.test(key)) { return ['filter', 'blue']; }
    if (/add|new|save|purchase|source|entry/.test(key)) { return ['plus', 'green']; }
    if (/price|fine/.test(key)) { return ['dollar', 'gold']; }
    if (/title/.test(key)) { return ['fileText', 'blue']; }
    if (/note/.test(key)) { return ['note', 'slate']; }
    if (/overview|information|book|library|service/.test(key)) { return ['book', 'blue']; }
    return ['spark', 'slate'];
  }

  function moduleRoot(node) {
    var current = node;
    while (current && current !== document.body) {
      if (current.classList && (
        current.classList.contains('form-container') ||
        current.classList.contains('table-container') ||
        current.classList.contains('section') ||
        current.classList.contains('bm-data-panel') ||
        current.classList.contains('bm-circulation-card') ||
        current.classList.contains('bm-public-actions')
      )) {
        return current;
      }
      if (current.parentNode && current.parentNode.classList && current.parentNode.classList.contains('content-wrapper') && current.tagName && current.tagName.toLowerCase() === 'div') {
        return current;
      }
      current = current.parentNode;
    }
    return node.parentNode || document.body;
  }

  function iconColor(iconName, fallback) {
    return {
      alert: 'red',
      arrowBack: 'teal',
      barcode: 'cyan',
      book: 'blue',
      bookmark: 'violet',
      boxes: 'orange',
      building: 'amber',
      calendar: 'teal',
      card: 'cyan',
      chart: 'orange',
      check: 'green',
      clipboard: 'slate',
      clock: 'gold',
      dollar: 'gold',
      fileText: 'blue',
      filter: 'blue',
      gear: 'orange',
      globe: 'teal',
      idCard: 'cyan',
      key: 'gold',
      layers: 'violet',
      map: 'amber',
      note: 'slate',
      pen: 'violet',
      phone: 'teal',
      repeat: 'green',
      shield: 'mint',
      sliders: 'violet',
      spark: 'slate',
      tag: 'mint',
      trash: 'red',
      trend: 'red',
      trophy: 'gold'
    }[iconName] || fallback || 'slate';
  }

  function iconAlternates(text, primary) {
    var key = String(text || '').toLowerCase();
    if (/reader id/.test(key)) { return ['idCard', 'key', 'user']; }
    if (/reader name/.test(key)) { return ['user', 'idCard', 'pen']; }
    if (/reader type/.test(key)) { return ['tag', 'sliders', 'shield']; }
    if (/id number/.test(key)) { return ['key', 'idCard', 'barcode']; }
    if (/library card/.test(key)) { return ['card', 'idCard', 'barcode']; }
    if (/barcode|isbn/.test(key)) { return ['barcode', 'idCard', 'key']; }
    if (/rank|ranking/.test(key)) { return ['trophy', 'spark', 'clipboard']; }
    if (/title/.test(key)) { return ['fileText', 'book', 'bookmark']; }
    if (/book/.test(key)) { return ['book', 'fileText', 'bookmark']; }
    if (/status/.test(key)) { return ['shield', 'check', 'alert']; }
    if (/copies/.test(key)) { return ['layers', 'boxes', 'chart']; }
    if (/out/.test(key)) { return ['arrowBack', 'boxes', 'clipboard']; }
    if (/inventory|stock|quantity|total/.test(key)) { return ['boxes', 'chart', 'clipboard']; }
    if (/demand/.test(key)) { return ['trend', 'alert', 'chart']; }
    if (/borrow date|shelf date/.test(key)) { return ['calendar', 'clock', 'bookmark']; }
    if (/due date|new due/.test(key)) { return ['clock', 'calendar', 'alert']; }
    if (/return/.test(key)) { return ['arrowBack', 'check', 'calendar']; }
    if (/reservation|reserve/.test(key)) { return ['bookmark', 'calendar', 'clipboard']; }
    if (/author/.test(key)) { return ['pen', 'user', 'fileText']; }
    if (/publisher/.test(key)) { return ['building', 'book', 'fileText']; }
    if (/location/.test(key)) { return ['map', 'building', 'tag']; }
    if (/contact/.test(key)) { return ['phone', 'user', 'idCard']; }
    if (/method/.test(key)) { return ['filter', 'search', 'sliders']; }
    if (/mode/.test(key)) { return ['sliders', 'filter', 'search']; }
    if (/keyword/.test(key)) { return ['key', 'search', 'tag']; }
    if (/records?|list/.test(key)) { return ['clipboard', 'fileText', 'book']; }
    return [primary, 'spark', 'clipboard', 'tag', 'fileText', 'bookmark', 'check', 'gear'];
  }

  function pickModuleIcon(text, node, modules) {
    var root = moduleRoot(node);
    var record = modules.filter(function (item) { return item.root === root; })[0];
    var primary = iconSpec(text);
    var names = iconAlternates(text, primary[0]);
    var fallbackPool = ['book', 'fileText', 'clipboard', 'tag', 'key', 'card', 'idCard', 'barcode', 'user', 'pen', 'building', 'map', 'shield', 'check', 'alert', 'boxes', 'trend', 'chart', 'calendar', 'clock', 'bookmark', 'gear', 'sliders', 'filter', 'phone', 'dollar', 'note', 'globe', 'layers', 'spark'];
    var i;
    var name;
    if (!record) {
      record = { root: root, used: {} };
      modules.push(record);
    }
    for (i = 0; i < names.length; i += 1) {
      name = names[i];
      if (!record.used[name]) {
        record.used[name] = true;
        return [name, iconColor(name, primary[1])];
      }
    }
    for (i = 0; i < fallbackPool.length; i += 1) {
      name = fallbackPool[i];
      if (!record.used[name]) {
        record.used[name] = true;
        return [name, iconColor(name, primary[1])];
      }
    }
    record.used[primary[0]] = true;
    return [primary[0], primary[1]];
  }

  function iconPath(name) {
    return {
      book: '<path d="M4 5.5c2.2-1.1 4.4-1.1 6.6.1V19c-2.2-1.2-4.4-1.2-6.6-.1V5.5Z"/><path d="M20 5.5c-2.2-1.1-4.4-1.1-6.6.1V19c2.2-1.2 4.4-1.2 6.6-.1V5.5Z"/><path d="M10.6 5.6h2.8"/>',
      plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
      search: '<circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/>',
      user: '<circle cx="12" cy="8" r="4"/><path d="M5 20c1.6-4 12.4-4 14 0"/>',
      chart: '<path d="M4 19h16"/><path d="M7 16V9"/><path d="M12 16V5"/><path d="M17 16v-4"/>',
      calendar: '<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4"/><path d="M16 3v4"/><path d="M4 10h16"/>',
      clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      barcode: '<path d="M4 5v14"/><path d="M7 5v14"/><path d="M11 5v14"/><path d="M15 5v14"/><path d="M20 5v14"/>',
      map: '<path d="M12 21s7-5.2 7-11a7 7 0 0 0-14 0c0 5.8 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/>',
      tag: '<path d="M20 13 12 21 3 12V4h8l9 9Z"/><circle cx="8" cy="8" r="1.5"/>',
      dollar: '<path d="M12 3v18"/><path d="M17 7.5c-1.2-1.5-7-2-7 1.2 0 3.8 8 1.7 8 6 0 3.4-6 3.2-8 1.1"/>',
      trash: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="m7 7 1 13h8l1-13"/><path d="M10 11v5"/><path d="M14 11v5"/>',
      pen: '<path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z"/><path d="m13.5 7.5 3 3"/>',
      gear: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7.5 7.5 0 0 0-1.7-1L14.5 3h-5l-.3 3.1a7.5 7.5 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7.5 7.5 0 0 0 1.7 1l.3 3.1h5l.3-3.1a7.5 7.5 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1Z"/>',
      trophy: '<path d="M8 4h8v4a4 4 0 0 1-8 0V4Z"/><path d="M8 6H5a3 3 0 0 0 3 4"/><path d="M16 6h3a3 3 0 0 1-3 4"/><path d="M12 12v5"/><path d="M8 21h8"/><path d="M10 17h4"/>',
      bookmark: '<path d="M6 4h12v17l-6-4-6 4V4Z"/>',
      check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/>',
      alert: '<path d="M12 4 3 20h18L12 4Z"/><path d="M12 9v5"/><path d="M12 17h.01"/>',
      boxes: '<path d="M4 9 12 5l8 4-8 4-8-4Z"/><path d="M4 9v6l8 4 8-4V9"/><path d="M12 13v6"/>',
      trend: '<path d="M4 17h16"/><path d="M6 14l4-4 3 3 5-7"/><path d="M15 6h3v3"/>',
      repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
      arrowBack: '<path d="M9 7 4 12l5 5"/><path d="M4 12h12a4 4 0 0 1 0 8h-1"/>',
      building: '<path d="M5 21V5l7-3 7 3v16"/><path d="M9 21v-5h6v5"/><path d="M9 7h.01"/><path d="M12 7h.01"/><path d="M15 7h.01"/><path d="M9 11h.01"/><path d="M12 11h.01"/><path d="M15 11h.01"/>',
      phone: '<path d="M7 4h4l2 5-2.5 1.6a12 12 0 0 0 4.9 4.9L17 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 6a2 2 0 0 1 2-2h2Z"/>',
      shield: '<path d="M12 3 20 6v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6l8-3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/>',
      filter: '<path d="M4 5h16l-6 7v5l-4 2v-7L4 5Z"/>',
      sliders: '<path d="M4 7h10"/><path d="M18 7h2"/><circle cx="16" cy="7" r="2"/><path d="M4 17h2"/><path d="M10 17h10"/><circle cx="8" cy="17" r="2"/>',
      clipboard: '<rect x="6" y="5" width="12" height="16" rx="2"/><path d="M9 5a3 3 0 0 1 6 0"/><path d="M9 11h6"/><path d="M9 15h6"/>',
      idCard: '<rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="11" r="2"/><path d="M6 16c1.4-2 4.6-2 6 0"/><path d="M14 10h4"/><path d="M14 14h3"/>',
      key: '<circle cx="7.5" cy="12.5" r="3.5"/><path d="M11 12.5h9"/><path d="M17 12.5V16"/><path d="M14 12.5V15"/>',
      card: '<rect x="3" y="6" width="18" height="12" rx="3"/><path d="M3 10h18"/><path d="M7 15h5"/>',
      fileText: '<path d="M6 3h8l4 4v14H6V3Z"/><path d="M14 3v5h5"/><path d="M9 13h6"/><path d="M9 17h5"/>',
      note: '<path d="M5 4h14v12l-5 5H5V4Z"/><path d="M14 21v-5h5"/><path d="M8 9h8"/><path d="M8 13h5"/>',
      globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2 2.5 3 5.5 3 9s-1 6.5-3 9"/><path d="M12 3c-2 2.5-3 5.5-3 9s1 6.5 3 9"/>',
      layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/>',
      spark: '<path d="m12 3 1.8 5.1L19 10l-5.2 1.9L12 17l-1.8-5.1L5 10l5.2-1.9L12 3Z"/>'
    }[name] || '';
  }

  function makeIcon(spec) {
    return el('span', {
      className: 'bm-ui-icon bm-ui-icon-' + spec[1],
      html: '<svg viewBox="0 0 24 24" aria-hidden="true">' + iconPath(spec[0]) + '</svg>'
    });
  }

  function decorateTextIcons() {
    var modules = [];
    qsa('.content-wrapper h2, .content-wrapper h3, .content-wrapper label, .content-wrapper th, .container h2, .container h3, .container label, .container th, .bm-dashboard-kicker, .bm-metric-label, .bm-data-panel-title span, .bm-circulation-card-title span').forEach(function (node) {
      var text = node.textContent || '';
      if (!text.trim() || qs('.bm-ui-icon', node)) {
        return;
      }
      if (node.tagName && node.tagName.toLowerCase() === 'th') {
        clear(node);
        node.appendChild(el('span', { className: 'bm-icon-text bm-header-icon-text' }, [makeIcon(pickModuleIcon(text, node, modules)), text.trim()]));
        return;
      }
      node.classList.add('bm-icon-text');
      node.insertBefore(makeIcon(pickModuleIcon(text, node, modules)), node.firstChild);
    });
  }

  function dashboard() {
    if (page() !== 'book-main.html') {
      return;
    }
    var wrapper = qs('.content-wrapper');
    if (!wrapper || qs('#bm-dashboard')) {
      return;
    }
    var state = store.load();
    store.refresh(state);
    store.save(state);
    var summary = store.summary(state);
    dashboardBookFall();
    var panel = ensurePanel(wrapper, 'bm-dashboard', '');
    clear(panel);
    panel.className = 'bm-dashboard';
    panel.removeAttribute('style');

    var header = el('div', { className: 'bm-dashboard-header' });
    var heading = el('div');
    heading.appendChild(el('p', { className: 'bm-dashboard-kicker', text: 'Library Overview' }));
    heading.appendChild(el('h2', { text: (BM.auth && !BM.auth.isAdmin()) ? 'Reader Service Portal' : 'Real-time Operation Panel' }));
    heading.appendChild(el('p', { className: 'bm-dashboard-subtitle', text: (BM.auth && !BM.auth.isAdmin()) ? 'Front-office catalog view for book discovery and availability checks.' : 'Live data from localStorage, including collection, circulation, readers and reservation status.' }));
    header.appendChild(heading);
    header.appendChild(el('div', { className: 'bm-dashboard-date', text: 'Updated ' + new Date().toLocaleString() }));
    panel.appendChild(header);

    var grid = el('div', { className: 'bm-metric-grid' });
    (BM.auth && !BM.auth.isAdmin() ? [
      ['Total Titles', summary.totalBooks, 'Collection size', 'blue'],
      ['Total Copies', summary.totalInventory, 'All physical copies', 'green'],
      ['Borrowable Titles', summary.availableBooks, 'Titles currently available', 'teal'],
      ['Borrowable Copies', summary.borrowableCopies, 'Copies ready to lend', 'mint'],
      ['Popular Borrows', summary.totalBorrowTimes, 'Total recorded borrow times', 'orange']
    ] : [
      ['Total Titles', summary.totalBooks, 'Collection size', 'blue'],
      ['Total Copies', summary.totalInventory, 'All physical copies', 'green'],
      ['Borrowable Titles', summary.availableBooks, 'Titles currently available', 'teal'],
      ['Borrowable Copies', summary.borrowableCopies, 'Copies ready to lend', 'mint'],
      ['Borrowed Copies', summary.borrowedCopies, 'Active loans', 'orange'],
      ['Overdue Books', summary.overdueBooks, 'Need attention', 'red'],
      ['Readers', summary.readers, 'Registered users', 'violet'],
      ['Reservations', summary.reservations, 'Open requests', 'cyan'],
      ['Utilization', summary.utilizationRate, 'Current circulation rate', 'indigo'],
      ['Fine Estimate', '$' + summary.overdueFineEstimate, 'Estimated overdue fine', 'slate']
    ]).forEach(function (item) {
      var card = el('div', { className: 'bm-metric-card bm-metric-' + item[3] });
      card.appendChild(el('span', { className: 'bm-metric-label', text: item[0] }));
      card.appendChild(el('strong', { className: 'bm-metric-value', text: item[1] }));
      card.appendChild(el('span', { className: 'bm-metric-note', text: item[2] }));
      grid.appendChild(card);
    });
    panel.appendChild(grid);

    if (BM.auth && !BM.auth.isAdmin()) {
      var publicPanel = ensurePanel(wrapper, 'bm-public-actions', '');
      clear(publicPanel);
      publicPanel.className = 'bm-dashboard bm-public-actions';
      publicPanel.removeAttribute('style');
      publicPanel.appendChild(el('h3', { text: 'Book Services' }));
      publicPanel.appendChild(el('div', { className: 'bm-public-link-grid' }, [
        el('a', { href: 'book-list.html', text: 'Browse Book List' }),
        el('a', { href: 'query-books.html', text: 'Search Books' })
      ]));
      return;
    }

    var split = el('div', { className: 'bm-dashboard-grid' });

    function miniTable(title, heads, rows) {
      var box = el('section', { className: 'bm-data-panel' });
      var titleBar = el('div', { className: 'bm-data-panel-title' });
      titleBar.appendChild(el('h3', { text: title }));
      titleBar.appendChild(el('span', { text: rows.length + ' records' }));
      box.appendChild(titleBar);
      var table = el('table', { className: 'bm-dashboard-table' });
      table.appendChild(el('thead', {}, [el('tr', {}, heads.map(function (head) { return el('th', { text: head }); }))]));
      var body = el('tbody');
      rows.forEach(function (row) {
        var rowKey = pillClass(row[0]);
        body.appendChild(el('tr', {}, row.map(function (cell, index) { return dashboardCell(cell, index, rowKey); })));
      });
      if (!rows.length) {
        empty(body, heads.length, 'No data.');
      }
      table.appendChild(body);
      box.appendChild(table);
      return box;
    }

    var typeMap = {};
    state.books.forEach(function (book) {
      var type = book.type || 'General';
      if (!typeMap[type]) {
        typeMap[type] = { total: 0, available: 0, borrowed: 0 };
      }
      typeMap[type].total += Number(book.inventory || 0);
      typeMap[type].available += book.status === 'Scrapped' ? 0 : Number(book.available || 0);
      typeMap[type].borrowed += Math.max(0, Number(book.inventory || 0) - Number(book.available || 0));
    });
    var typeRows = Object.keys(typeMap).sort().map(function (type) {
      return [type, typeMap[type].total, typeMap[type].available, typeMap[type].borrowed];
    });
    var popularRows = state.books.slice().sort(function (a, b) { return Number(b.borrowCount || 0) - Number(a.borrowCount || 0); }).slice(0, 5).map(function (book) {
      return [book.title, book.borrowCount || 0, book.available || 0];
    });
    var overdueRows = state.borrowRecords.filter(function (record) { return record.status === 'Overdue'; }).slice(0, 5).map(function (record) {
      return [record.bookTitle, record.readerName, record.dueDate];
    });
    var reserveRows = state.reservations.filter(function (item) { return item.status === 'Waiting' || item.status === 'Ready' || item.status === 'Notified'; }).slice(0, 5).map(function (item) {
      return [item.bookTitle, item.readerName, item.status];
    });

    split.appendChild(miniTable('Inventory by Type', ['Type', 'Copies', 'Can Borrow', 'Out'], typeRows));
    split.appendChild(miniTable('Popular Books', ['Title', 'Borrows', 'Can Borrow'], popularRows));
    split.appendChild(miniTable('Overdue Alerts', ['Title', 'Reader', 'Due Date'], overdueRows));
    split.appendChild(miniTable('Reservation Queue', ['Title', 'Reader', 'Status'], reserveRows));
    panel.appendChild(split);

    var list = el('ul');
    (state.activities || []).slice(0, 8).forEach(function (activity) {
      list.appendChild(el('li', { text: activity.type + ': ' + activity.message + ' (' + new Date(activity.time).toLocaleString() + ')' }));
    });
    panel.appendChild(el('h3', { text: 'Recent Activities' }));
    panel.appendChild(list);
  }

  function renderBookTable(books, tbody, actions) {
    if (!tbody) {
      return;
    }
    if (!books.length) {
      empty(tbody, actions ? 7 : 6, 'No books found.');
      return;
    }
    clear(tbody);
    books.forEach(function (book) {
      var row = el('tr');
      [book.title, book.author, book.isbn, book.publisher, book.location, book.status].forEach(function (value, index) {
        row.appendChild(bookTableCell(value, index));
      });
      if (actions) {
        var actionCell = el('td');
        actionCell.appendChild(button('Edit', 'edit-btn', function () { location.href = 'add-book.html?edit=' + encodeURIComponent(book.id); }));
        actionCell.appendChild(button('Delete', 'delete-btn', function () {
          if (!confirm('Delete book "' + book.title + '"?')) {
            return;
          }
          try {
            store.deleteBook(book.id);
            toast('Book deleted.');
            renderBookList();
          } catch (error) {
            handle(error);
          }
        }));
        actionCell.appendChild(button('Scrap', 'scrap-btn', function () {
          if (!confirm('Scrap book "' + book.title + '"?')) {
            return;
          }
          try {
            store.scrapBook(book.id);
            toast('Book scrapped.');
            renderBookList();
          } catch (error) {
            handle(error);
          }
        }));
        actionCell.appendChild(button('Relocate', 'relocate-btn', function () {
          var locationValue = prompt('Input new location:', book.location);
          if (locationValue === null) {
            return;
          }
          try {
            store.relocateBook(book.id, locationValue);
            toast('Book relocated.');
            renderBookList();
          } catch (error) {
            handle(error);
          }
        }));
        row.appendChild(actionCell);
      }
      tbody.appendChild(row);
    });
  }

  function renderBookList() {
    if (page() !== 'book-list.html') {
      return;
    }
    var state = store.load();
    store.refresh(state);
    store.save(state);
    var hasActions = !!(BM.auth && BM.auth.isAdmin());
    var table = qs('table');
    var headerRow = qs('table thead tr');
    var headers = qsa('th', headerRow);
    if (table) {
      table.className = hasActions ? 'bm-actions-table' : 'bm-readonly-table';
    }
    if (headerRow && hasActions && headers.length === 6) {
      headerRow.appendChild(el('th', { text: 'Actions' }));
    }
    if (headerRow && !hasActions && headers.length > 6) {
      headerRow.removeChild(headers[headers.length - 1]);
    }
    renderBookTable(state.books, qs('table tbody'), hasActions);
  }

  BM.ui = { qs: qs, qsa: qsa, el: el, clear: clear, td: td, pillTd: pillTd, button: button, page: page, value: value, setValue: setValue, toast: toast, handle: handle, empty: empty, ensurePanel: ensurePanel, readerType: readerType, certified: certified, resetButton: resetButton, dashboard: dashboard, renderBookTable: renderBookTable, renderBookList: renderBookList, dashboardBookFall: dashboardBookFall, decorateTextIcons: decorateTextIcons };
})();
