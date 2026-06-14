/* global window */
(function () {
  'use strict';

  var BM = window.BookManagement = window.BookManagement || {};
  var ui = BM.ui;
  var store = BM.store;

  function today() {
    return BM.utils.dateText();
  }

  function setDefaultDates() {
    if (ui.page() !== 'borrow-management.html') {
      return;
    }
    ui.setValue('borrow-date', today());
    ui.setValue('return-date', BM.utils.addDays(30));
    ui.setValue('actual-return-date', today());
    ui.setValue('new-return-date', BM.utils.addDays(45));
    ui.setValue('reserve-date', today());
  }

  function panel() {
    var wrapper = ui.qs('.content-wrapper');
    if (!wrapper) {
      return null;
    }
    var node = ui.ensurePanel(wrapper, 'bm-circulation-panel', '');
    node.className = 'bm-circulation-panel';
    node.removeAttribute('style');
    return node;
  }

  function statusBadge(status) {
    var value = status || 'Unknown';
    return ui.el('span', { className: 'bm-status-badge bm-status-' + value.toLowerCase(), text: value });
  }

  function appendCell(row, child) {
    var cell = ui.el('td');
    cell.appendChild(child);
    row.appendChild(cell);
  }

  function renderRecords() {
    if (ui.page() !== 'borrow-management.html') {
      return;
    }
    var host = panel();
    if (!host) {
      return;
    }
    ui.clear(host);
    var state = store.load();
    store.refresh(state);
    store.save(state);

    var activeBorrowCount = state.borrowRecords.filter(function (record) {
      return record.status === 'Borrowed' || record.status === 'Overdue';
    }).length;
    var overdueCount = state.borrowRecords.filter(function (record) {
      return record.status === 'Overdue';
    }).length;
    var returnedCount = state.borrowRecords.filter(function (record) {
      return record.status === 'Returned';
    }).length;
    var openReservations = (state.reservations || []).filter(function (reservation) {
      return reservation.status === 'Waiting' || reservation.status === 'Ready' || reservation.status === 'Notified';
    }).length;

    var header = ui.el('div', { className: 'bm-circulation-header' });
    var heading = ui.el('div');
    heading.appendChild(ui.el('p', { className: 'bm-circulation-kicker', text: 'Circulation Desk' }));
    heading.appendChild(ui.el('h2', { text: 'Borrow Records and Reservations' }));
    heading.appendChild(ui.el('p', { className: 'bm-circulation-subtitle', text: 'Track active loans, returns, renewals and reservation queue from localStorage.' }));
    header.appendChild(heading);
    host.appendChild(header);

    var stats = ui.el('div', { className: 'bm-circulation-stats' });
    [
      ['Active Loans', activeBorrowCount],
      ['Overdue', overdueCount],
      ['Returned', returnedCount],
      ['Open Reservations', openReservations]
    ].forEach(function (item) {
      var stat = ui.el('div', { className: 'bm-circulation-stat' });
      stat.appendChild(ui.el('span', { text: item[0] }));
      stat.appendChild(ui.el('strong', { text: item[1] }));
      stats.appendChild(stat);
    });
    host.appendChild(stats);

    var grid = ui.el('div', { className: 'bm-circulation-grid' });
    var recordPanel = ui.el('section', { className: 'bm-circulation-card bm-circulation-card-wide' });
    recordPanel.appendChild(ui.el('div', { className: 'bm-circulation-card-title', html: '<h3>Borrow Records</h3><span>' + state.borrowRecords.length + ' records</span>' }));
    var table = ui.el('table', { className: 'bm-circulation-table' });
    table.appendChild(ui.el('thead', {}, [ui.el('tr', {}, ['Book', 'Reader', 'Borrow Date', 'Due Date', 'Return Date', 'Status', 'Renew'].map(function (head) { return ui.el('th', { text: head }); }))]));
    var body = ui.el('tbody');
    if (!state.borrowRecords.length) {
      ui.empty(body, 7, 'No borrow records found.');
    } else {
      state.borrowRecords.forEach(function (record) {
        var row = ui.el('tr');
        row.appendChild(ui.td(record.bookTitle));
        row.appendChild(ui.td(record.readerName));
        row.appendChild(ui.td(record.borrowDate));
        row.appendChild(ui.td(record.dueDate));
        row.appendChild(ui.td(record.actualReturnDate || '-'));
        appendCell(row, statusBadge(record.status));
        row.appendChild(ui.td(record.renewTimes || 0));
        body.appendChild(row);
      });
    }
    table.appendChild(body);
    recordPanel.appendChild(table);
    grid.appendChild(recordPanel);

    var reservePanel = ui.el('section', { className: 'bm-circulation-card' });
    var reservations = state.reservations || [];
    reservePanel.appendChild(ui.el('div', { className: 'bm-circulation-card-title', html: '<h3>Reservations</h3><span>' + reservations.length + ' records</span>' }));
    var reserveTable = ui.el('table', { className: 'bm-circulation-table' });
    reserveTable.appendChild(ui.el('thead', {}, [ui.el('tr', {}, ['Book', 'Reader', 'Reserve Date', 'Status', 'Actions'].map(function (head) { return ui.el('th', { text: head }); }))]));
    var reserveBody = ui.el('tbody');
    if (!reservations.length) {
      ui.empty(reserveBody, 5, 'No reservations found.');
    } else {
      reservations.forEach(function (reservation) {
        var row = ui.el('tr');
        row.appendChild(ui.td(reservation.bookTitle));
        row.appendChild(ui.td(reservation.readerName));
        row.appendChild(ui.td(reservation.reserveDate));
        appendCell(row, statusBadge(reservation.status));
        var actions = ui.el('td');
        if (reservation.status === 'Waiting' || reservation.status === 'Ready' || reservation.status === 'Notified') {
          actions.appendChild(ui.button('Cancel', 'bm-cancel-reservation', function () {
            try {
              store.cancelReservation(reservation.id);
              ui.toast('Reservation cancelled.');
              renderRecords();
            } catch (error) {
              ui.handle(error);
            }
          }));
        } else {
          actions.textContent = '-';
        }
        row.appendChild(actions);
        reserveBody.appendChild(row);
      });
    }
    reserveTable.appendChild(reserveBody);
    reservePanel.appendChild(reserveTable);
    grid.appendChild(reservePanel);
    host.appendChild(grid);
  }

  function bind(id, action, payload) {
    var form = ui.qs('#' + id);
    if (!form) {
      return;
    }
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      try {
        store[action](payload());
        ui.toast('Operation completed.');
        form.reset();
        setDefaultDates();
        renderRecords();
      } catch (error) {
        ui.handle(error);
      }
    });
  }

  function init() {
    if (ui.page() !== 'borrow-management.html') {
      return;
    }
    setDefaultDates();
    bind('borrowForm', 'borrowBook', function () { return { bookTitle: ui.value('book-title'), readerName: ui.value('reader-name'), borrowDate: ui.value('borrow-date'), dueDate: ui.value('return-date') }; });
    bind('returnForm', 'returnBook', function () { return { bookTitle: ui.value('return-book-title'), readerName: ui.value('return-reader-name'), actualReturnDate: ui.value('actual-return-date') }; });
    bind('renewForm', 'renewBook', function () { return { bookTitle: ui.value('renew-book-title'), readerName: ui.value('renew-reader-name'), newDueDate: ui.value('new-return-date') }; });
    bind('reserveForm', 'reserveBook', function () { return { bookTitle: ui.value('reserve-book-title'), readerName: ui.value('reserve-reader-name'), reserveDate: ui.value('reserve-date') }; });
    renderRecords();
  }

  BM.circulation = { init: init, renderRecords: renderRecords };
})();
