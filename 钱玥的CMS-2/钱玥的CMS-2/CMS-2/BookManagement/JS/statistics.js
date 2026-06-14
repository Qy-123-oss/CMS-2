/* global window, Vue */
(function () {
  'use strict';

  var BM = window.BookManagement = window.BookManagement || {};
  var store = BM.store;
  var app = null;

  function page() {
    return (window.location.pathname.split('/').pop() || '').toLowerCase();
  }

  function loadState() {
    var state = store.load();
    store.refresh(state);
    store.save(state);
    return state;
  }

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

  function pillClass(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function cellClass(value, index) {
    var text = String(value === null || typeof value === 'undefined' ? '' : value);
    var isNumber = /^-?\d+(\.\d+)?$/.test(text);
    var isWord = /^[A-Za-z]+$/.test(text);
    if (!isNumber && !isWord) {
      return '';
    }
    return 'bm-table-pill ' + (isNumber ? 'bm-table-pill-number' : 'bm-table-pill-word') +
      ' bm-table-pill-col-' + index + ' bm-table-pill-value-' + pillClass(text);
  }

  var ReportTable = {
    props: ['headers', 'rows'],
    methods: {
      cellClass: cellClass
    },
    template:
      '<table border="1" cellspacing="0" cellpadding="5">' +
        '<thead><tr><th v-for="head in headers" :key="head">{{ head }}</th></tr></thead>' +
        '<tbody>' +
          '<tr v-for="(row, rowIndex) in rows" :key="rowIndex">' +
            '<td v-for="(cell, index) in row" :key="index">' +
              '<span v-if="cellClass(cell, index)" :class="cellClass(cell, index)">{{ cell }}</span>' +
              '<span v-else>{{ cell }}</span>' +
            '</td>' +
          '</tr>' +
        '</tbody>' +
      '</table>'
  };

  function init() {
    var mount = document.getElementById('statistics-app');
    if (page() !== 'statistics.html' || !mount) {
      return;
    }
    if (!window.Vue || !window.Vue.createApp) {
      return;
    }

    app = Vue.createApp({
      components: { ReportTable: ReportTable },
      data: function () {
        return {
          state: loadState()
        };
      },
      computed: {
        popular: function () {
          return this.state.books.slice().sort(function (a, b) {
            return Number(b.borrowCount || 0) - Number(a.borrowCount || 0);
          }).slice(0, 10).map(function (book, index) {
            return [index + 1, book.title, book.author, book.borrowCount || 0, book.inventory || 1, book.available || 0];
          });
        },
        statusRows: function () {
          return groupByType(this.state.books).map(function (row) {
            var rate = row.total ? ((row.borrowed / row.total) * 100).toFixed(1) + '%' : '0.0%';
            return [row.type, row.total, row.borrowed, row.available, rate];
          });
        },
        overstock: function () {
          var rows = this.state.books.filter(function (book) {
            return Number(book.inventory || 0) >= 5 && Number(book.borrowCount || 0) <= 1;
          }).map(function (book) {
            return [book.title, book.author, book.inventory || 1, book.borrowCount || 0, Number(book.borrowCount || 0) === 0 ? 'Severely Overstocked' : 'Overstocked'];
          });
          return rows.length ? rows : [['-', '-', '-', '-', 'No Overstock']];
        },
        stockout: function () {
          var rows = this.state.books.filter(function (book) {
            return Number(book.demand || 0) > Number(book.available || 0);
          }).map(function (book) {
            var shortage = Math.max(0, Number(book.demand || 0) - Number(book.available || 0));
            return [book.title, book.author, book.demand || 0, book.available || 0, shortage, shortage >= 3 ? 'Urgent' : 'Normal'];
          });
          return rows.length ? rows : [['-', '-', '-', '-', '-', 'No Shortage']];
        },
        recommendations: function () {
          var rows = [];
          this.stockout.filter(function (row) { return row[0] !== '-'; }).slice(0, 8).forEach(function (row) {
            rows.push(['Popular Book Supplement', row[0], 'High demand and insufficient current availability', row[4]]);
          });
          this.overstock.filter(function (row) { return row[0] !== '-'; }).slice(0, 4).forEach(function (row) {
            rows.push(['Elimination and Update', row[0], 'Low borrowing frequency and excessive stock', '0 (Recommend Removal)']);
          });
          return rows.length ? rows : [['Inventory Stable', 'No extra purchase', 'Current demand is covered', 0]];
        }
      },
      methods: {
        reload: function () {
          this.state = loadState();
        }
      },
      template:
        '<div>' +
          '<h2>Book Borrowing Statistics</h2>' +
          '<h3>Popular Book Ranking</h3>' +
          '<report-table :headers="[\'Rank\', \'Title\', \'Author\', \'Borrowing Times\', \'Total Inventory\', \'Currently Available\']" :rows="popular"></report-table>' +
          '<h3>Borrowing Status by Book Type</h3>' +
          '<report-table :headers="[\'Book Type\', \'Total Quantity\', \'Borrowed Quantity\', \'Available Quantity\', \'Borrowing Rate\']" :rows="statusRows"></report-table>' +
        '</div>' +
        '<div>' +
          '<h2>Inventory Analysis Report</h2>' +
          '<h3>Inventory Overstock Situation</h3>' +
          '<report-table :headers="[\'Title\', \'Author\', \'Total Inventory\', \'Borrowing Times (Last 6 Months)\', \'Status\']" :rows="overstock"></report-table>' +
          '<h3>Stockout Situation</h3>' +
          '<report-table :headers="[\'Title\', \'Author\', \'Demand\', \'Current Inventory\', \'Shortage Quantity\', \'Urgency Level\']" :rows="stockout"></report-table>' +
        '</div>' +
        '<div>' +
          '<h2>Purchasing Recommendations</h2>' +
          '<report-table :headers="[\'Recommendation Category\', \'Recommended Books\', \'Reason\', \'Recommended Purchase Quantity\']" :rows="recommendations"></report-table>' +
        '</div>'
    }).mount('#statistics-app');
  }

  function render() {
    if (app && app.reload) {
      app.reload();
      return;
    }
    init();
  }

  BM.statistics = { render: render, init: init };
})();
