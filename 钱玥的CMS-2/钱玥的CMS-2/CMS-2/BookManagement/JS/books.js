/* global window, location */
(function () {
  'use strict';

  var BM = window.BookManagement = window.BookManagement || {};
  var ui = BM.ui;
  var store = BM.store;

  //get query parameters from URL
  function getQueryParam(name) {
    var query = location.search ? location.search.substring(1).split('&') : [];
    var i;
    var pair;
    for (i = 0; i < query.length; i += 1) {
      pair = query[i].split('=');
      if (decodeURIComponent(pair[0] || '') === name) {
        return decodeURIComponent((pair[1] || '').replace(/\+/g, ' '));
      }
    }
    return '';
  }
  //enhance book form with additional fields
  function enhanceBookForm() {
    var form = ui.qs('#addBookForm');
    if (!form || ui.qs('#book-type')) {
      return;
    }
    var submitRow = ui.qsa('p', form).slice(-1)[0];
    [
      ['book-type', 'Type:', 'text', 'General', 'Please enter the book type'],
      ['inventory', 'Inventory:', 'number', '1', 'Please enter inventory'],
      ['demand', 'Demand:', 'number', '1', 'Please enter demand'],
      ['language', 'Language:', 'text', 'English', 'Please enter language'],
      ['edition', 'Edition:', 'text', '1st', 'Please enter edition'],
      ['price', 'Price:', 'number', '0', 'Please enter price'],
      ['shelf-date', 'Shelf Date:', 'date', BM.utils.dateText(), 'Please choose shelf date'],
      ['source', 'Source:', 'text', 'Purchase', 'Purchase, Donation or Exchange'],
      ['keywords', 'Keywords:', 'text', '', 'Separate keywords with commas'],
      ['note', 'Note:', 'text', '', 'Optional note']
    ].forEach(function (field) {
      var input = ui.el('input', { type: field[2], id: field[0], name: field[0], value: field[3], placeholder: field[4] });
      if (field[2] === 'number') {
        input.setAttribute('min', field[0] === 'price' ? '0' : '1');
      }
      form.insertBefore(ui.el('p', {}, [ui.el('label', { for: field[0], text: field[1] }), input]), submitRow);
    });
    var tools = ui.el('p', {}, [
      ui.el('label', { text: 'Tools:' }),
      ui.button('Fill from Reference', 'relocate-btn', function () {
        var keyword = (ui.value('isbn') || ui.value('book-title')).toLowerCase();
        var item = BM.businessRules.findReferenceBook(keyword);
        if (!item) {
          ui.toast('No matching reference item found.', 'error');
          return;
        }
        ui.setValue('book-title', item.title);
        ui.setValue('author', item.author);
        ui.setValue('isbn', item.isbn);
        ui.setValue('publisher', item.publisher);
        ui.setValue('book-type', item.type);
        ui.setValue('location', item.locationHint);
        ui.setValue('keywords', item.keywords);
        ui.toast('Reference data filled.');
      })
    ]);
    form.insertBefore(tools, submitRow);
  }
  //fill book form with existing data for editing
  function fillBookForm(book) {
    ui.setValue('book-title', book.title);
    ui.setValue('author', book.author);
    ui.setValue('isbn', book.isbn);
    ui.setValue('publisher', book.publisher);
    ui.setValue('location', book.location);
    ui.setValue('book-type', book.type || 'General');
    ui.setValue('inventory', book.inventory || 1);
    ui.setValue('demand', book.demand || 1);
    ui.setValue('note', book.note || '');
    ui.setValue('language', book.language || 'English');
    ui.setValue('edition', book.edition || '1st');
    ui.setValue('price', book.price || 0);
    ui.setValue('shelf-date', book.shelfDate || BM.utils.dateText());
    ui.setValue('source', book.source || 'Purchase');
    ui.setValue('keywords', book.keywords || '');
  }
  //get payload from book form
  function payload() {
    return {
      title: ui.value('book-title'),
      author: ui.value('author'),
      isbn: ui.value('isbn'),
      publisher: ui.value('publisher'),
      location: ui.value('location'),
      type: ui.value('book-type') || 'General',
      inventory: Number(ui.value('inventory') || 1),
      demand: Number(ui.value('demand') || 1),
      language: ui.value('language') || 'English',
      edition: ui.value('edition') || '1st',
      price: Number(ui.value('price') || 0),
      shelfDate: ui.value('shelf-date') || BM.utils.dateText(),
      source: ui.value('source') || 'Purchase',
      keywords: ui.value('keywords'),
      note: ui.value('note')
    };
  }
  //init add book page
  function initAddBook() {
    if (ui.page() !== 'add-book.html') {
      return;
    }
    enhanceBookForm();
    var form = ui.qs('#addBookForm');
    var editingId = getQueryParam('edit');
    if (editingId) {
      var book = store.bookById(store.load(), editingId);
      if (book) {
        fillBookForm(book);
        var submit = ui.qs('input[type="submit"]', form);
        if (submit) {
          submit.value = 'Update Book Information';
        }
      }
    }
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      try {
        store.saveBook(payload(), editingId);
        BM.utils.flash(editingId ? 'Book updated successfully.' : 'Book added successfully.');
        location.href = 'book-list.html';
      } catch (error) {
        ui.handle(error);
      }
    });
  }

  function initBookList() {
    ui.renderBookList();
  }

  function initQuery() {
    if (ui.page() !== 'query-books.html') {
      return;
    }
    var tbody = ui.qs('table tbody');
    ui.renderBookTable(store.load().books, tbody, false);
    ui.qs('#searchForm').addEventListener('submit', function (event) {
      event.preventDefault();
      try {
        var results = store.searchBooks({ type: ui.value('search-type'), keyword: ui.value('search-keyword'), mode: ui.value('search-mode') });
        ui.renderBookTable(results, tbody, false);
        ui.toast('Found ' + results.length + ' book(s).');
      } catch (error) {
        ui.handle(error);
      }
    });
  }

  BM.books = { initAddBook: initAddBook, initBookList: initBookList, initQuery: initQuery };
})();
