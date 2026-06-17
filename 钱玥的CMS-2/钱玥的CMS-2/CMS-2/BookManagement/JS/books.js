/* global window, document, location, FileReader, Image */
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

  function textOrDash(value) {
    return value || '-';
  }

  function field(label, value) {
    return ui.el('div', { className: 'bm-detail-field' }, [
      ui.el('span', { text: label }),
      ui.el('strong', { text: textOrDash(value) })
    ]);
  }

  function stat(label, value, note, tone) {
    return ui.el('article', { className: 'bm-detail-stat bm-detail-stat-' + (tone || 'blue') }, [
      ui.el('span', { text: label }),
      ui.el('strong', { text: String(value) }),
      ui.el('small', { text: note })
    ]);
  }

  function tablePanel(title, headers, rows) {
    var panel = ui.el('section', { className: 'bm-detail-panel' });
    panel.appendChild(ui.el('div', { className: 'bm-detail-panel-title' }, [
      ui.el('h3', { text: title }),
      ui.el('span', { text: rows.length + ' records' })
    ]));
    var table = ui.el('table', { className: 'bm-detail-table' });
    table.appendChild(ui.el('thead', {}, [
      ui.el('tr', {}, headers.map(function (head) { return ui.el('th', { text: head }); }))
    ]));
    var body = ui.el('tbody');
    if (!rows.length) {
      ui.empty(body, headers.length, 'No related data.');
    } else {
      rows.forEach(function (row) {
        body.appendChild(ui.el('tr', {}, row.map(function (cell, index) {
          return ui.pillTd(cell, index);
        })));
      });
    }
    table.appendChild(body);
    panel.appendChild(table);
    return panel;
  }

  function coverPlaceholder(book) {
    var words = String(book.title || 'Book').split(/\s+/).filter(Boolean).slice(0, 3);
    return ui.el('div', { className: 'bm-detail-cover-placeholder' }, [
      ui.el('span', { text: words.join(' ') || 'Book Cover' }),
      ui.el('small', { text: 'Import an actual cover image' })
    ]);
  }

  function compressCoverImage(source, done, fail) {
    var image = new Image();
    image.onload = function () {
      var maxWidth = 720;
      var maxHeight = 960;
      var ratio = Math.min(1, maxWidth / image.width, maxHeight / image.height);
      var canvas = document.createElement('canvas');
      var context = canvas.getContext('2d');
      canvas.width = Math.max(1, Math.round(image.width * ratio));
      canvas.height = Math.max(1, Math.round(image.height * ratio));
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      done(canvas.toDataURL('image/jpeg', 0.78));
    };
    image.onerror = function () {
      fail(new Error('Cover image could not be loaded.'));
    };
    image.src = source;
  }

  function renderBookDetail(root, state, book) {
    var activeRecords = state.borrowRecords.filter(function (record) {
      return record.bookId === book.id;
    });
    var reservations = state.reservations.filter(function (item) {
      return item.bookId === book.id;
    });
    var borrowedCopies = Math.max(0, Number(book.inventory || 0) - Number(book.available || 0));
    var availableRate = Number(book.inventory || 0) ? Math.round((Number(book.available || 0) / Number(book.inventory || 0)) * 100) : 0;
    var demandGap = Math.max(0, Number(book.demand || 0) - Number(book.available || 0));
    var coverBox;
    var uploadInput;
    var canManage = !!(BM.auth && BM.auth.canManageBooks());

    ui.clear(root);
    root.appendChild(ui.el('div', { className: 'bm-detail-hero' }, [
      ui.el('div', { className: 'bm-detail-hero-copy' }, [
        ui.el('p', { className: 'bm-detail-kicker', text: 'Book Detail' }),
        ui.el('h2', { text: book.title }),
        ui.el('p', { text: 'A complete collection profile with cover image, circulation status, inventory health and related records.' }),
        ui.el('div', { className: 'bm-detail-actions' }, [
          ui.el('a', { href: 'book-list.html', text: 'Back to List' }),
          ui.el('a', { href: 'query-books.html', text: 'Search Books' })
        ])
      ]),
      ui.el('div', { className: 'bm-detail-status-card' }, [
        ui.el('span', { text: 'Current Status' }),
        ui.el('strong', { text: book.status }),
        ui.el('small', { text: availableRate + '% copies available' })
      ])
    ]));

    var overview = ui.el('section', { className: 'bm-detail-overview' });
    coverBox = ui.el('div', { className: 'bm-detail-cover-box' });
    if (book.coverImage) {
      coverBox.appendChild(ui.el('img', { src: book.coverImage, alt: book.title + ' cover' }));
    } else {
      coverBox.appendChild(coverPlaceholder(book));
    }
    uploadInput = ui.el('input', { type: 'file', id: 'book-cover-upload', accept: 'image/*' });
    overview.appendChild(ui.el('div', { className: 'bm-detail-cover-card' }, [
      coverBox,
      canManage ? ui.el('label', { className: 'bm-cover-upload-btn', for: 'book-cover-upload', text: 'Import Cover Image' }) : ui.el('p', { className: 'bm-cover-readonly-note', text: 'Cover image can be managed by library staff.' }),
      canManage ? uploadInput : ui.el('span', { className: 'bm-detail-hidden' }),
      ui.el('p', { text: canManage ? 'The imported image is saved locally with this book record.' : 'Readers can view the current collection profile.' })
    ]));

    overview.appendChild(ui.el('div', { className: 'bm-detail-info-card' }, [
      ui.el('div', { className: 'bm-detail-field-grid' }, [
        field('Author', book.author),
        field('ISBN', book.isbn),
        field('Publisher', book.publisher),
        field('Location', book.location),
        field('Type', book.type || 'General'),
        field('Language', book.language || 'English'),
        field('Edition', book.edition || '1st'),
        field('Shelf Date', book.shelfDate || book.createdAt),
        field('Source', book.source || 'Purchase'),
        field('Price', '$' + Number(book.price || 0).toFixed(2)),
        field('Keywords', book.keywords),
        field('Updated', book.updatedAt)
      ]),
      ui.el('div', { className: 'bm-detail-note' }, [
        ui.el('span', { text: 'Note' }),
        ui.el('p', { text: book.note || 'No note has been added for this book.' })
      ])
    ]));
    root.appendChild(overview);

    root.appendChild(ui.el('div', { className: 'bm-detail-stat-grid' }, [
      stat('Inventory', book.inventory || 0, 'Total copies', 'blue'),
      stat('Available', book.available || 0, 'Ready to borrow', 'green'),
      stat('Borrowed', borrowedCopies, 'Currently out', 'orange'),
      stat('Demand Gap', demandGap, 'Demand beyond available', demandGap ? 'red' : 'violet'),
      stat('Borrow Count', book.borrowCount || 0, 'Historical popularity', 'violet'),
      stat('Reservations', reservations.length, 'Related requests', 'cyan')
    ]));

    root.appendChild(ui.el('div', { className: 'bm-detail-related-grid' }, [
      tablePanel('Circulation Records', ['Record', 'Reader', 'Borrow Date', 'Due Date', 'Status'], activeRecords.map(function (record) {
        return [record.id, record.readerName, record.borrowDate, record.dueDate, record.status];
      })),
      tablePanel('Reservation Records', ['Queue', 'Reader', 'Reserve Date', 'Status'], reservations.map(function (item, index) {
        return [index + 1, item.readerName, item.reserveDate, item.status];
      }))
    ]));

    if (!canManage) {
      return;
    }

    uploadInput.addEventListener('change', function () {
      var file = uploadInput.files && uploadInput.files[0];
      var reader;
      if (!file) {
        return;
      }
      if (!/^image\//.test(file.type)) {
        ui.toast('Please choose an image file.', 'error');
        return;
      }
      if (file.size > 6 * 1024 * 1024) {
        ui.toast('Image is too large. Please choose an image under 6 MB.', 'error');
        return;
      }
      reader = new FileReader();
      reader.onload = function () {
        compressCoverImage(reader.result, function (coverImage) {
          var nextState;
          try {
            store.saveBookCover(book.id, coverImage);
            nextState = store.refresh(store.load());
            ui.toast('Cover image imported and saved.');
            renderBookDetail(root, nextState, store.bookById(nextState, book.id));
          } catch (error) {
            ui.handle(new Error('Cover image could not be saved. Please choose a smaller image.'));
          }
        }, function (error) {
          ui.handle(error);
        });
      };
      reader.readAsDataURL(file);
    });
  }

  function initBookDetail() {
    if (ui.page() !== 'book-detail.html') {
      return;
    }
    var root = ui.qs('#bookDetailRoot');
    var state = store.refresh(store.load());
    var book = store.bookById(state, getQueryParam('id'));
    if (!root) {
      return;
    }
    if (!book) {
      ui.clear(root);
      root.appendChild(ui.el('section', { className: 'bm-detail-empty' }, [
        ui.el('h2', { text: 'Book not found' }),
        ui.el('p', { text: 'The selected book does not exist or has been removed.' }),
        ui.el('a', { href: 'book-list.html', text: 'Back to Book List' })
      ]));
      return;
    }
    renderBookDetail(root, state, book);
  }

  BM.books = { initAddBook: initAddBook, initBookList: initBookList, initQuery: initQuery, initBookDetail: initBookDetail };
})();
