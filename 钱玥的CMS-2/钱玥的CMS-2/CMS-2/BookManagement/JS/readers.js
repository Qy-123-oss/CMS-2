/* global window, confirm, setTimeout */
(function () {
  'use strict';

  var BM = window.BookManagement = window.BookManagement || {};
  var ui = BM.ui;
  var store = BM.store;
  var editingReaderId = '';

  function payload() {
    return {
      readerName: ui.value('readerName'),
      idCard: ui.value('idCard'),
      readerType: ui.value('readerType'),
      contact: ui.value('contact'),
      certified: ui.value('certified') || 'no'
    };
  }

  function fill(reader) {
    ui.setValue('readerId', reader.readerId);
    ui.setValue('readerName', reader.readerName);
    ui.setValue('idCard', reader.idCard);
    ui.setValue('readerType', reader.readerType);
    ui.setValue('contact', reader.contact);
    ui.setValue('cardNumber', reader.cardNumber);
    ui.setValue('barcode', reader.barcode);
    ui.setValue('certified', reader.certified);
    editingReaderId = reader.readerId;
  }

  function resetForm() {
    var form = ui.qs('#readerForm');
    if (form) {
      form.reset();
    }
    editingReaderId = '';
    ui.setValue('readerId', '');
    ui.setValue('cardNumber', '');
    ui.setValue('barcode', '');
  }

  function render() {
    if (ui.page() !== 'reader-management.html') {
      return;
    }
    var tbody = ui.qs('#readerTable tbody');
    var readers = store.load().readers;
    if (!readers.length) {
      ui.empty(tbody, 9, 'No readers found.');
      return;
    }
    ui.clear(tbody);
    readers.forEach(function (reader) {
      var row = ui.el('tr');
      [
        reader.readerId,
        reader.readerName,
        reader.idCard,
        ui.readerType(reader.readerType),
        reader.contact,
        reader.cardNumber,
        reader.barcode,
        ui.certified(reader.certified)
      ].forEach(function (value, index) {
        row.appendChild(ui.pillTd(value, index));
      });
      var actions = ui.el('td', { className: 'action-buttons' });
      actions.appendChild(ui.button('Edit', 'btn', function () { fill(reader); window.scrollTo({ top: 0, behavior: 'smooth' }); }));
      actions.appendChild(ui.button('Delete', 'btn btn-danger', function () {
        if (!confirm('Delete reader "' + reader.readerName + '"?')) {
          return;
        }
        try {
          store.deleteReader(reader.readerId);
          ui.toast('Reader deleted.');
          render();
          resetForm();
        } catch (error) {
          ui.handle(error);
        }
      }));
      row.appendChild(actions);
      tbody.appendChild(row);
    });
  }

  function init() {
    if (ui.page() !== 'reader-management.html') {
      return;
    }
    render();
    ui.qs('#readerForm').addEventListener('submit', function (event) {
      event.preventDefault();
      try {
        store.saveReader(payload(), editingReaderId);
        ui.toast(editingReaderId ? 'Reader updated.' : 'Reader saved.');
        resetForm();
        render();
      } catch (error) {
        ui.handle(error);
      }
    });
    ui.qs('#readerForm').addEventListener('reset', function () {
      setTimeout(resetForm, 0);
    });
  }

  BM.readers = { init: init, render: render };
})();
