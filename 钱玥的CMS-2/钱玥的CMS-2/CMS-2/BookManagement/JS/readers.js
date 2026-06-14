/* global window, confirm, Vue */
(function () {
  'use strict';

  var BM = window.BookManagement = window.BookManagement || {};
  var store = BM.store;
  var app = null;

  function page() {
    return (window.location.pathname.split('/').pop() || '').toLowerCase();
  }

  function blankForm() {
    return {
      readerId: '',
      readerName: '',
      idCard: '',
      readerType: '',
      contact: '',
      cardNumber: '',
      barcode: '',
      certified: 'no'
    };
  }

  function loadReaders() {
    var state = store.load();
    store.refresh(state);
    store.save(state);
    return state.readers;
  }

  function pillClass(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function cellClass(value, index) {
    var text = String(value === null || typeof value === 'undefined' ? '' : value);
    var isNumber = /^-?\d+(\.\d+)?$/.test(text);
    var isWord = /^[A-Za-z]+$/.test(text.replace(/\s+/g, ''));
    if (!isNumber && !isWord) {
      return '';
    }
    return 'bm-table-pill ' + (isNumber ? 'bm-table-pill-number' : 'bm-table-pill-word') +
      ' bm-table-pill-col-' + index + ' bm-table-pill-value-' + pillClass(text);
  }

  function notify(message, type) {
    if (BM.notify) {
      BM.notify(message, type);
    }
  }

  function handle(error) {
    notify(error && error.message ? error.message : String(error), 'error');
  }

  function readerType(value) {
    return { student: 'Student', teacher: 'Teacher', visitor: 'Visitor' }[value] || value || '';
  }

  function certified(value) {
    return value === 'yes' ? 'Verified' : 'Not Verified';
  }

  function init() {
    var mount = document.getElementById('reader-app');
    if (page() !== 'reader-management.html' || !mount) {
      return;
    }
    if (!window.Vue || !window.Vue.createApp) {
      return;
    }
    app = Vue.createApp({
      data: function () {
        return {
          editingReaderId: '',
          form: blankForm(),
          readers: loadReaders(),
          fields: [
            { id: 'readerId', key: 'readerId', label: 'Reader ID:', readonly: true },
            { id: 'readerName', key: 'readerName', label: 'Reader Name:', required: true },
            { id: 'idCard', key: 'idCard', label: 'ID Number:', required: true },
            { id: 'readerType', key: 'readerType', label: 'Reader Type:', required: true, options: [
              { value: '', label: 'Please Select' },
              { value: 'student', label: 'Student' },
              { value: 'teacher', label: 'Teacher' },
              { value: 'visitor', label: 'Visitor' }
            ] },
            { id: 'contact', key: 'contact', label: 'Contact:', required: true },
            { id: 'cardNumber', key: 'cardNumber', label: 'Library Card Number:', readonly: true },
            { id: 'barcode', key: 'barcode', label: 'Barcode:', readonly: true },
            { id: 'certified', key: 'certified', label: 'Real-name Authentication:', required: true, options: [
              { value: 'no', label: 'Not Verified' },
              { value: 'yes', label: 'Verified' }
            ] }
          ],
          headers: ['Reader ID', 'Reader Name', 'ID Number', 'Reader Type', 'Contact', 'Library Card Number', 'Barcode', 'Authentication']
        };
      },
      methods: {
        readerType: function (value) {
          return readerType(value);
        },
        certified: function (value) {
          return certified(value);
        },
        cellClass: cellClass,
        rowValues: function (reader) {
          return [
            reader.readerId,
            reader.readerName,
            reader.idCard,
            this.readerType(reader.readerType),
            reader.contact,
            reader.cardNumber,
            reader.barcode,
            this.certified(reader.certified)
          ];
        },
        reload: function () {
          this.readers = loadReaders();
        },
        resetForm: function () {
          this.editingReaderId = '';
          this.form = blankForm();
        },
        edit: function (reader) {
          this.editingReaderId = reader.readerId;
          this.form = {
            readerId: reader.readerId,
            readerName: reader.readerName,
            idCard: reader.idCard,
            readerType: reader.readerType,
            contact: reader.contact,
            cardNumber: reader.cardNumber,
            barcode: reader.barcode,
            certified: reader.certified || 'no'
          };
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        remove: function (reader) {
          if (!confirm('Delete reader "' + reader.readerName + '"?')) {
            return;
          }
          try {
            store.deleteReader(reader.readerId);
            notify('Reader deleted.');
            this.resetForm();
            this.reload();
          } catch (error) {
            handle(error);
          }
        },
        submit: function () {
          try {
            store.saveReader({
              readerName: this.form.readerName,
              idCard: this.form.idCard,
              readerType: this.form.readerType,
              contact: this.form.contact,
              certified: this.form.certified || 'no'
            }, this.editingReaderId);
            notify(this.editingReaderId ? 'Reader updated.' : 'Reader saved.');
            this.resetForm();
            this.reload();
          } catch (error) {
            handle(error);
          }
        }
      },
      template:
        '<div>' +
          '<div class="section">' +
            '<h2>Reader Information Entry</h2>' +
            '<form id="readerForm" action="#" method="post" @submit.prevent="submit" @reset.prevent="resetForm">' +
              '<div class="form-group" v-for="field in fields" :key="field.key">' +
                '<label :for="field.id">{{ field.label }}</label>' +
                '<select v-if="field.options" :id="field.id" :name="field.id" :required="field.required" v-model="form[field.key]" :disabled="field.readonly">' +
                  '<option v-for="option in field.options" :key="option.value" :value="option.value">{{ option.label }}</option>' +
                '</select>' +
                '<input v-else type="text" :id="field.id" :name="field.id" :required="field.required" :readonly="field.readonly" v-model="form[field.key]">' +
              '</div>' +
              '<div>' +
                '<button type="submit" class="btn">{{ editingReaderId ? "Update Reader Information" : "Save Reader Information" }}</button>' +
                '<button type="reset" class="btn btn-secondary">Reset</button>' +
              '</div>' +
            '</form>' +
          '</div>' +
          '<div class="section">' +
            '<h2>Reader Information List</h2>' +
            '<table id="readerTable">' +
              '<thead><tr><th v-for="head in headers" :key="head">{{ head }}</th><th>Actions</th></tr></thead>' +
              '<tbody>' +
                '<tr v-if="!readers.length"><td colspan="9" class="bm-empty-row">No readers found.</td></tr>' +
                '<tr v-for="reader in readers" :key="reader.readerId">' +
                  '<td v-for="(value, index) in rowValues(reader)" :key="index">' +
                    '<span v-if="cellClass(value, index)" :class="cellClass(value, index)">{{ value }}</span>' +
                    '<span v-else>{{ value }}</span>' +
                  '</td>' +
                  '<td class="action-buttons">' +
                    '<button type="button" class="btn" @click="edit(reader)">Edit</button>' +
                    '<button type="button" class="btn btn-danger" @click="remove(reader)">Delete</button>' +
                  '</td>' +
                '</tr>' +
              '</tbody>' +
            '</table>' +
          '</div>' +
        '</div>'
    }).mount('#reader-app');
  }

  function render() {
    if (app && app.reload) {
      app.reload();
    }
  }

  BM.readers = { init: init, render: render };
})();
