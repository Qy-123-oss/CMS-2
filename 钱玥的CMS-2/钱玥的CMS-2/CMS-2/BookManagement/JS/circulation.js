/* global window, Vue */
(function () {
  'use strict';

  var BM = window.BookManagement = window.BookManagement || {};
  var store = BM.store;
  var app = null;

  function page() {
    return (window.location.pathname.split('/').pop() || '').toLowerCase();
  }

  function today() {
    return BM.utils.dateText();
  }

  function defaultForms() {
    return {
      borrow: { bookTitle: '', readerName: '', borrowDate: today(), dueDate: BM.utils.addDays(30) },
      returnBook: { bookTitle: '', readerName: '', actualReturnDate: today() },
      renew: { bookTitle: '', readerName: '', newDueDate: BM.utils.addDays(45) },
      reserve: { bookTitle: '', readerName: '', reserveDate: today() }
    };
  }

  function loadState() {
    var state = store.load();
    store.refresh(state);
    store.save(state);
    return state;
  }

  function notify(message, type) {
    if (BM.notify) {
      BM.notify(message, type);
    }
  }

  function handle(error) {
    notify(error && error.message ? error.message : String(error), 'error');
  }

  function init() {
    var mount = document.getElementById('circulation-app');
    if (page() !== 'borrow-management.html' || !mount) {
      return;
    }
    if (!window.Vue || !window.Vue.createApp) {
      return;
    }

    app = Vue.createApp({
      data: function () {
        var state = loadState();
        return {
          state: state,
          forms: defaultForms(),
          formCards: [
            { key: 'borrow', title: 'Borrow Books', submit: 'Process Borrowing', action: 'borrowBook', fields: [
              { key: 'bookTitle', id: 'book-title', label: 'Book Title:', type: 'text', placeholder: 'Please enter the book title' },
              { key: 'readerName', id: 'reader-name', label: 'Reader Name:', type: 'text', placeholder: 'Please enter the reader name' },
              { key: 'borrowDate', id: 'borrow-date', label: 'Borrow Date:', type: 'date' },
              { key: 'dueDate', id: 'return-date', label: 'Due Date:', type: 'date' }
            ] },
            { key: 'returnBook', title: 'Return Books', submit: 'Process Return', action: 'returnBook', fields: [
              { key: 'bookTitle', id: 'return-book-title', label: 'Book Title:', type: 'text', placeholder: 'Please enter the book title' },
              { key: 'readerName', id: 'return-reader-name', label: 'Reader Name:', type: 'text', placeholder: 'Please enter the reader name' },
              { key: 'actualReturnDate', id: 'actual-return-date', label: 'Actual Return Date:', type: 'date' }
            ] },
            { key: 'renew', title: 'Renew Books', submit: 'Process Renewal', action: 'renewBook', fields: [
              { key: 'bookTitle', id: 'renew-book-title', label: 'Book Title:', type: 'text', placeholder: 'Please enter the book title' },
              { key: 'readerName', id: 'renew-reader-name', label: 'Reader Name:', type: 'text', placeholder: 'Please enter the reader name' },
              { key: 'newDueDate', id: 'new-return-date', label: 'New Due Date:', type: 'date' }
            ] },
            { key: 'reserve', title: 'Reserve Books', submit: 'Process Reservation', action: 'reserveBook', fields: [
              { key: 'bookTitle', id: 'reserve-book-title', label: 'Book Title:', type: 'text', placeholder: 'Please enter the book title' },
              { key: 'readerName', id: 'reserve-reader-name', label: 'Reader Name:', type: 'text', placeholder: 'Please enter the reader name' },
              { key: 'reserveDate', id: 'reserve-date', label: 'Reservation Date:', type: 'date' }
            ] }
          ]
        };
      },
      computed: {
        activeBorrowCount: function () {
          return this.state.borrowRecords.filter(function (record) {
            return record.status === 'Borrowed' || record.status === 'Overdue';
          }).length;
        },
        overdueCount: function () {
          return this.state.borrowRecords.filter(function (record) { return record.status === 'Overdue'; }).length;
        },
        returnedCount: function () {
          return this.state.borrowRecords.filter(function (record) { return record.status === 'Returned'; }).length;
        },
        openReservations: function () {
          return (this.state.reservations || []).filter(function (reservation) {
            return reservation.status === 'Waiting' || reservation.status === 'Ready' || reservation.status === 'Notified';
          }).length;
        },
        stats: function () {
          return [
            ['Active Loans', this.activeBorrowCount],
            ['Overdue', this.overdueCount],
            ['Returned', this.returnedCount],
            ['Open Reservations', this.openReservations]
          ];
        }
      },
      methods: {
        statusClass: function (status) {
          return 'bm-status-badge bm-status-' + String(status || 'unknown').toLowerCase();
        },
        reload: function () {
          this.state = loadState();
        },
        resetForm: function (key) {
          this.forms[key] = defaultForms()[key];
        },
        submit: function (card) {
          try {
            store[card.action](this.forms[card.key]);
            notify('Operation completed.');
            this.resetForm(card.key);
            this.reload();
          } catch (error) {
            handle(error);
          }
        },
        cancelReservation: function (reservation) {
          try {
            store.cancelReservation(reservation.id);
            notify('Reservation cancelled.');
            this.reload();
          } catch (error) {
            handle(error);
          }
        },
        canCancel: function (reservation) {
          return reservation.status === 'Waiting' || reservation.status === 'Ready' || reservation.status === 'Notified';
        }
      },
      template:
        '<div class="form-container" v-for="card in formCards" :key="card.key">' +
          '<h2>{{ card.title }}</h2>' +
          '<form action="#" method="POST" :id="card.key + \'Form\'" @submit.prevent="submit(card)">' +
            '<p v-for="field in card.fields" :key="field.key">' +
              '<label :for="field.id">{{ field.label }}</label>' +
              '<input :type="field.type" :id="field.id" :name="field.id" required :placeholder="field.placeholder" v-model="forms[card.key][field.key]">' +
            '</p>' +
            '<p><input type="submit" :value="card.submit"></p>' +
          '</form>' +
        '</div>' +
        '<div class="bm-circulation-panel">' +
          '<div class="bm-circulation-header">' +
            '<div>' +
              '<p class="bm-circulation-kicker">Circulation Desk</p>' +
              '<h2>Borrow Records and Reservations</h2>' +
              '<p class="bm-circulation-subtitle">Track active loans, returns, renewals and reservation queue from localStorage.</p>' +
            '</div>' +
          '</div>' +
          '<div class="bm-circulation-stats">' +
            '<div class="bm-circulation-stat" v-for="item in stats" :key="item[0]">' +
              '<span>{{ item[0] }}</span><strong>{{ item[1] }}</strong>' +
            '</div>' +
          '</div>' +
          '<div class="bm-circulation-grid">' +
            '<section class="bm-circulation-card bm-circulation-card-wide">' +
              '<div class="bm-circulation-card-title"><h3>Borrow Records</h3><span>{{ state.borrowRecords.length }} records</span></div>' +
              '<table class="bm-circulation-table">' +
                '<thead><tr><th>Book</th><th>Reader</th><th>Borrow Date</th><th>Due Date</th><th>Return Date</th><th>Status</th><th>Renew</th></tr></thead>' +
                '<tbody>' +
                  '<tr v-if="!state.borrowRecords.length"><td colspan="7" class="bm-empty-row">No borrow records found.</td></tr>' +
                  '<tr v-for="record in state.borrowRecords" :key="record.id">' +
                    '<td>{{ record.bookTitle }}</td><td>{{ record.readerName }}</td><td>{{ record.borrowDate }}</td><td>{{ record.dueDate }}</td><td>{{ record.actualReturnDate || "-" }}</td>' +
                    '<td><span :class="statusClass(record.status)">{{ record.status }}</span></td><td>{{ record.renewTimes || 0 }}</td>' +
                  '</tr>' +
                '</tbody>' +
              '</table>' +
            '</section>' +
            '<section class="bm-circulation-card">' +
              '<div class="bm-circulation-card-title"><h3>Reservations</h3><span>{{ (state.reservations || []).length }} records</span></div>' +
              '<table class="bm-circulation-table">' +
                '<thead><tr><th>Book</th><th>Reader</th><th>Reserve Date</th><th>Status</th><th>Actions</th></tr></thead>' +
                '<tbody>' +
                  '<tr v-if="!(state.reservations || []).length"><td colspan="5" class="bm-empty-row">No reservations found.</td></tr>' +
                  '<tr v-for="reservation in state.reservations" :key="reservation.id">' +
                    '<td>{{ reservation.bookTitle }}</td><td>{{ reservation.readerName }}</td><td>{{ reservation.reserveDate }}</td>' +
                    '<td><span :class="statusClass(reservation.status)">{{ reservation.status }}</span></td>' +
                    '<td><button v-if="canCancel(reservation)" type="button" class="bm-cancel-reservation" @click="cancelReservation(reservation)">Cancel</button><span v-else>-</span></td>' +
                  '</tr>' +
                '</tbody>' +
              '</table>' +
            '</section>' +
          '</div>' +
        '</div>'
    }).mount('#circulation-app');
  }

  function renderRecords() {
    if (app && app.reload) {
      app.reload();
    }
  }

  BM.circulation = { init: init, renderRecords: renderRecords };
})();
