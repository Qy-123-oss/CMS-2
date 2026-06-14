/* global window */
(function () {
  'use strict';

  var BM = window.BookManagement = window.BookManagement || {};
  var ui = BM.ui;
  var store = BM.store;

  function groupByType(books) {
    var map = {};
    books.forEach(function (book) {
      var type = book.type || 'General';
      if (!map[type]) {
        map[type] = { type: type, total: 0, borrowed: 0, available: 0 };
      }
      map[type].total += Number(book.inventory || 1);
      map[type].available += Number(book.available || 0);
      map[type].borrowed += Math.max(0, Number(book.inventory || 1) - Number(book.available || 0));
    });
    return Object.keys(map).map(function (key) { return map[key]; });
  }

  function table(headers, rows) {
    var node = ui.el('table', { border: '1', cellspacing: '0', cellpadding: '5' });
    node.appendChild(ui.el('thead', {}, [ui.el('tr', {}, headers.map(function (head) { return ui.el('th', { text: head }); }))]));
    var body = ui.el('tbody');
    rows.forEach(function (row) {
      body.appendChild(ui.el('tr', {}, row.map(function (cell, index) { return ui.pillTd(cell, index); })));
    });
    node.appendChild(body);
    return node;
  }

  function render() {
    if (ui.page() !== 'statistics.html') {
      return;
    }
    var wrapper = ui.qs('.content-wrapper');
    if (!wrapper) {
      return;
    }
    var state = store.load();
    store.refresh(state);
    store.save(state);
    ui.clear(wrapper);

    var popular = state.books.slice().sort(function (a, b) { return Number(b.borrowCount || 0) - Number(a.borrowCount || 0); }).slice(0, 10).map(function (book, index) {
      return [index + 1, book.title, book.author, book.borrowCount || 0, book.inventory || 1, book.available || 0];
    });
    var statusRows = groupByType(state.books).map(function (row) {
      var rate = row.total ? ((row.borrowed / row.total) * 100).toFixed(1) + '%' : '0.0%';
      return [row.type, row.total, row.borrowed, row.available, rate];
    });
    var overstock = state.books.filter(function (book) { return Number(book.inventory || 0) >= 5 && Number(book.borrowCount || 0) <= 1; }).map(function (book) {
      return [book.title, book.author, book.inventory || 1, book.borrowCount || 0, Number(book.borrowCount || 0) === 0 ? 'Severely Overstocked' : 'Overstocked'];
    });
    var stockout = state.books.filter(function (book) { return Number(book.demand || 0) > Number(book.available || 0); }).map(function (book) {
      var shortage = Math.max(0, Number(book.demand || 0) - Number(book.available || 0));
      return [book.title, book.author, book.demand || 0, book.available || 0, shortage, shortage >= 3 ? 'Urgent' : 'Normal'];
    });
    var recommendations = stockout.slice(0, 8).map(function (row) {
      return ['Popular Book Supplement', row[0], 'High demand and insufficient current availability', row[4]];
    });
    overstock.slice(0, 4).forEach(function (row) {
      recommendations.push(['Elimination and Update', row[0], 'Low borrowing frequency and excessive stock', '0 (Recommend Removal)']);
    });

    var borrowing = ui.el('div');
    borrowing.appendChild(ui.el('h2', { text: 'Book Borrowing Statistics' }));
    borrowing.appendChild(ui.el('h3', { text: 'Popular Book Ranking' }));
    borrowing.appendChild(table(['Rank', 'Title', 'Author', 'Borrowing Times', 'Total Inventory', 'Currently Available'], popular));
    borrowing.appendChild(ui.el('h3', { text: 'Borrowing Status by Book Type' }));
    borrowing.appendChild(table(['Book Type', 'Total Quantity', 'Borrowed Quantity', 'Available Quantity', 'Borrowing Rate'], statusRows));
    wrapper.appendChild(borrowing);

    var inventory = ui.el('div');
    inventory.appendChild(ui.el('h2', { text: 'Inventory Analysis Report' }));
    inventory.appendChild(ui.el('h3', { text: 'Inventory Overstock Situation' }));
    inventory.appendChild(table(['Title', 'Author', 'Total Inventory', 'Borrowing Times (Last 6 Months)', 'Status'], overstock.length ? overstock : [['-', '-', '-', '-', 'No Overstock']]));
    inventory.appendChild(ui.el('h3', { text: 'Stockout Situation' }));
    inventory.appendChild(table(['Title', 'Author', 'Demand', 'Current Inventory', 'Shortage Quantity', 'Urgency Level'], stockout.length ? stockout : [['-', '-', '-', '-', '-', 'No Shortage']]));
    wrapper.appendChild(inventory);

    var purchase = ui.el('div');
    purchase.appendChild(ui.el('h2', { text: 'Purchasing Recommendations' }));
    purchase.appendChild(table(['Recommendation Category', 'Recommended Books', 'Reason', 'Recommended Purchase Quantity'], recommendations.length ? recommendations : [['Inventory Stable', 'No extra purchase', 'Current demand is covered', 0]]));
    wrapper.appendChild(purchase);
  }

  BM.statistics = { render: render };
})();
