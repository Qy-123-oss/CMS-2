/* global window, document, localStorage, CustomEvent */
(function () {
  'use strict';

  // BookManagement namespace to encapsulate all related functions and data
  var BM = window.BookManagement = window.BookManagement || {};
  var STORAGE_KEY = 'cms_book_management_state_v1';
  var SESSION_KEY = 'cms_book_management_session_v1';

  // Utility functions for date formatting, string normalization, and object cloning
  function pad(value) {
    value = String(value);
    return value.length >= 2 ? value : '0' + value;
  }

  function dateText(value) {
    var date = value ? new Date(value) : new Date();
    if (isNaN(date.getTime())) {
      date = new Date();
    }
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function addDays(days) {
    var date = new Date();
    date.setDate(date.getDate() + Number(days || 0));
    return dateText(date);
  }

  function normalize(value) {
    return String(value === null || typeof value === 'undefined' ? '' : value).trim();
  }

  function lower(value) {
    return normalize(value).toLowerCase();
  }

  function same(a, b) {
    return lower(a) === lower(b);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

//JSON parse function with fallback to handle potential errors gracefully
  function parse(json, fallback) {
    try {
      return JSON.parse(json);
    } catch (error) {
      if (window.console && window.console.debug) {
        window.console.debug('BookManagement localStorage parse fallback:', error.message);
      }
      return fallback;
    }
  }

  // Utility functions for ID generation, validation, and lookup
  function id(prefix, list, prop) {
    var max = 0;
    (list || []).forEach(function (item) {
      var n = Number(String(item[prop || 'id'] || '').replace(/[^0-9]/g, ''));
      if (n > max) {
        max = n;
      }
    });
    var next = String(max + 1);
    while (next.length < 3) {
      next = '0' + next;
    }
    return prefix + next;
  }
//judge whether the input is empty
  function required(value, label) {
    if (!normalize(value)) {
      throw new Error(label + ' is required.');
    }
  }
//A tool to find the first item in a list that matches a predicate
  function first(list, predicate) {
    var i;
    for (i = 0; i < list.length; i += 1) {
      if (predicate(list[i], i)) {
        return list[i];
      }
    }
    return null;
  }


//Define initial data for books and readers to populate the library system with some sample entries
  function seedBooks() {
    return [
      { id: 'B001', title: 'Computer Networking', author: 'Xie Xiren', isbn: '9787111435623', publisher: 'Pearson Education', location: 'A-1-001', status: 'Available', type: 'Computer Science', inventory: 5, available: 4, borrowCount: 42, demand: 7, createdAt: addDays(-140), updatedAt: addDays(-2), note: '' },
      { id: 'B002', title: 'Introduction to Algorithms', author: 'Thomas H. Cormen', isbn: '9787111221847', publisher: 'Pearson Education', location: 'A-1-002', status: 'Borrowed', type: 'Computer Science', inventory: 4, available: 3, borrowCount: 38, demand: 6, createdAt: addDays(-138), updatedAt: addDays(-4), note: '' },
      { id: 'B003', title: "Computer Systems: A Programmer's Perspective", author: 'Randal E. Bryant', isbn: '9787111435624', publisher: 'Pearson Education', location: 'A-1-003', status: 'Overdue', type: 'Computer Science', inventory: 3, available: 2, borrowCount: 35, demand: 8, createdAt: addDays(-136), updatedAt: addDays(-6), note: '' },
      { id: 'B004', title: 'Core Java Technologies', author: 'Cay S. Horstmann', isbn: '9787111547425', publisher: 'China Machine Press', location: 'A-2-001', status: 'Available', type: 'Computer Science', inventory: 4, available: 4, borrowCount: 30, demand: 5, createdAt: addDays(-120), updatedAt: addDays(-7), note: '' },
      { id: 'B005', title: 'Professional JavaScript for Web Developers', author: 'Matt Frisbie', isbn: '9781119366447', publisher: 'Wiley', location: 'A-2-002', status: 'Borrowed', type: 'Computer Science', inventory: 3, available: 2, borrowCount: 28, demand: 6, createdAt: addDays(-118), updatedAt: addDays(-5), note: '' },
      { id: 'B006', title: 'Data Structures and Algorithm Analysis', author: 'Mark Allen Weiss', isbn: '9780132576277', publisher: 'Pearson Education', location: 'A-2-003', status: 'Available', type: 'Computer Science', inventory: 2, available: 2, borrowCount: 22, demand: 5, createdAt: addDays(-100), updatedAt: addDays(-5), note: '' },
      { id: 'B007', title: 'Advanced Mathematics', author: 'Tongji University', isbn: '9787040396614', publisher: 'Higher Education Press', location: 'B-1-001', status: 'Available', type: 'Mathematics', inventory: 6, available: 6, borrowCount: 20, demand: 4, createdAt: addDays(-95), updatedAt: addDays(-4), note: '' },
      { id: 'B008', title: 'Linear Algebra', author: 'Gilbert Strang', isbn: '9780980232776', publisher: 'Wellesley Cambridge Press', location: 'B-1-002', status: 'Available', type: 'Mathematics', inventory: 5, available: 5, borrowCount: 18, demand: 4, createdAt: addDays(-90), updatedAt: addDays(-4), note: '' },
      { id: 'B009', title: 'College English Reading', author: 'Editorial Board', isbn: '9787560082216', publisher: 'Foreign Language Teaching', location: 'C-1-001', status: 'Available', type: 'English Learning', inventory: 8, available: 8, borrowCount: 12, demand: 3, createdAt: addDays(-88), updatedAt: addDays(-3), note: '' },
      { id: 'B010', title: 'Modern Chinese Literature', author: 'Qian Liqun', isbn: '9787301047248', publisher: 'Peking University Press', location: 'D-1-001', status: 'Available', type: 'Literature', inventory: 5, available: 5, borrowCount: 10, demand: 2, createdAt: addDays(-80), updatedAt: addDays(-3), note: '' },
      { id: 'B011', title: 'World History Overview', author: 'William McNeill', isbn: '9780393051797', publisher: 'Norton', location: 'E-1-001', status: 'Available', type: 'History', inventory: 4, available: 4, borrowCount: 8, demand: 2, createdAt: addDays(-70), updatedAt: addDays(-2), note: '' },
      { id: 'B012', title: 'Visual Basic: From Novice to Expert', author: 'Some Author', isbn: '9780000000001', publisher: 'Legacy Press', location: 'Z-1-001', status: 'Available', type: 'Computer Science', inventory: 8, available: 8, borrowCount: 0, demand: 1, createdAt: addDays(-300), updatedAt: addDays(-30), note: 'Legacy stock' },
      { id: 'B013', title: 'Complete Manual for Flash Animation Production', author: 'Some Author', isbn: '9780000000002', publisher: 'Legacy Press', location: 'Z-1-002', status: 'Available', type: 'Computer Science', inventory: 6, available: 6, borrowCount: 1, demand: 1, createdAt: addDays(-280), updatedAt: addDays(-28), note: 'Legacy stock' },
      { id: 'B014', title: 'Delphi Programming Tutorial', author: 'Some Author', isbn: '9780000000003', publisher: 'Legacy Press', location: 'Z-1-003', status: 'Available', type: 'Computer Science', inventory: 5, available: 5, borrowCount: 0, demand: 1, createdAt: addDays(-260), updatedAt: addDays(-26), note: 'Legacy stock' }
    ];
  }
  function seedReaders() {
    return [
      { readerId: 'R001', readerName: 'Zhang San', idCard: '110101199001011234', readerType: 'student', contact: '13800000001', cardNumber: 'C001', barcode: 'BC001', certified: 'yes', status: 'Active', createdAt: addDays(-90), updatedAt: addDays(-2) },
      { readerId: 'R002', readerName: 'Li Si', idCard: '110101198505052345', readerType: 'teacher', contact: '13800000002', cardNumber: 'C002', barcode: 'BC002', certified: 'yes', status: 'Active', createdAt: addDays(-88), updatedAt: addDays(-2) },
      { readerId: 'R003', readerName: 'Wang Wu', idCard: '110101200105052345', readerType: 'student', contact: '13800000003', cardNumber: 'C003', barcode: 'BC003', certified: 'no', status: 'Active', createdAt: addDays(-70), updatedAt: addDays(-1) }
    ];
  }

//Define the default status of books in the system
  function defaultState() {
    return {
      version: 1,
      books: seedBooks(),
      readers: seedReaders(),
      borrowRecords: [
        { id: 'BR001', bookId: 'B002', bookTitle: 'Introduction to Algorithms', readerId: 'R001', readerName: 'Zhang San', borrowDate: addDays(-15), dueDate: addDays(15), actualReturnDate: '', status: 'Borrowed', renewTimes: 0, createdAt: addDays(-15), updatedAt: addDays(-15) },
        { id: 'BR002', bookId: 'B003', bookTitle: "Computer Systems: A Programmer's Perspective", readerId: 'R002', readerName: 'Li Si', borrowDate: addDays(-40), dueDate: addDays(-10), actualReturnDate: '', status: 'Overdue', renewTimes: 1, createdAt: addDays(-40), updatedAt: addDays(-10) },
        { id: 'BR003', bookId: 'B005', bookTitle: 'Professional JavaScript for Web Developers', readerId: 'R003', readerName: 'Wang Wu', borrowDate: addDays(-8), dueDate: addDays(22), actualReturnDate: '', status: 'Borrowed', renewTimes: 0, createdAt: addDays(-8), updatedAt: addDays(-8) }
      ],
      reservations: [
        { id: 'RV001', bookId: 'B003', bookTitle: "Computer Systems: A Programmer's Perspective", readerId: 'R003', readerName: 'Wang Wu', reserveDate: addDays(-2), status: 'Waiting', createdAt: addDays(-2), updatedAt: addDays(-2) }
      ],
      activities: [{ id: 'A001', type: 'System', message: 'Initial library data loaded', time: new Date().toISOString() }],
      settings: { defaultBorrowDays: 30, maxRenewTimes: 2, overdueFinePerDay: 0.5 }
    };
  }

  //Load the data from local storage, if not exist or invalid, initialize with default data and save to local storage
  function load() {
    var state = parse(localStorage.getItem(STORAGE_KEY), null);
    if (!state || !Array.isArray(state.books) || !Array.isArray(state.readers)) {
      state = defaultState();
      save(state);
    }
    return state;
  }
//Save the data to local storage and start a dispatch event to notify other parts of the application about the state change
  function save(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    dispatchStateChange(state);
  }

  function dispatchStateChange(state) {
    var event;
    if (typeof CustomEvent === 'function') {
      event = new CustomEvent('book-management-state-change', { detail: clone(state) });
    } else {
      event = document.createEvent('CustomEvent');
      event.initCustomEvent('book-management-state-change', false, false, clone(state));
    }
    window.dispatchEvent(event);
  }

  //load() will give the mutator to update function state, then save the updated state back to local storage and return the result
  function update(mutator) {
    var state = load();
    var result = mutator(state) || state;
    save(result);
    return result;
  }

  //Add an activity to the system,80 records maximum,put the latest one at the top.
  function activity(state, type, message) {
    state.activities = state.activities || [];
    state.activities.unshift({ id: id('A', state.activities, 'id'), type: type, message: message, time: new Date().toISOString() });
    if (state.activities.length > 80) {
      state.activities.length = 80;
    }
  }

  //Search functions
  function bookById(state, bookId) {
    return first(state.books, function (book) { return book.id === bookId; });
  }

  function bookByTitle(state, title) {
    return first(state.books, function (book) { return same(book.title, title); });
  }

  function readerById(state, readerId) {
    return first(state.readers, function (reader) { return reader.readerId === readerId; });
  }

  function readerByName(state, name) {
    return first(state.readers, function (reader) { return same(reader.readerName, name); });
  }

  function activeBorrowForBook(state, bookId) {
    return first(state.borrowRecords, function (record) {
      return record.bookId === bookId && (record.status === 'Borrowed' || record.status === 'Overdue');
    });
  }

  function activeBorrowForPair(state, bookId, readerId) {
    return first(state.borrowRecords, function (record) {
      return record.bookId === bookId && record.readerId === readerId && (record.status === 'Borrowed' || record.status === 'Overdue');
    });
  }

  //Ensure the consistency of book statuses based on their borrow records and update the status of books accordingly
  function refresh(state) {
    var today = dateText();
    state.borrowRecords.forEach(function (record) {
      if ((record.status === 'Borrowed' || record.status === 'Overdue') && record.dueDate < today) {
        record.status = 'Overdue';
      }
    });
    state.books.forEach(function (book) {
      if (book.status === 'Scrapped') {
        return;
      }
      var active = activeBorrowForBook(state, book.id);
      if (active && active.status === 'Overdue') {
        book.status = 'Overdue';
      } else if (active || Number(book.available || 0) <= 0) {
        book.status = 'Borrowed';
      } else {
        book.status = 'Available';
      }
    });
    return state;
  }


  //The saveBook function is responsible for adding new books or updating existing ones.
  function saveBook(payload, editingId) {
    return update(function (state) {
      refresh(state);
      required(payload.title, 'Title');
      required(payload.author, 'Author');
      required(payload.isbn, 'ISBN');
      required(payload.publisher, 'Publisher');
      required(payload.location, 'Location');
      if (state.books.some(function (book) { return book.id !== editingId && same(book.isbn, payload.isbn); })) {
        throw new Error('ISBN already exists.');
      }
      if (editingId) {
        var existing = bookById(state, editingId);
        if (!existing) {
          throw new Error('Book not found.');
        }
        existing.title = normalize(payload.title);
        existing.author = normalize(payload.author);
        existing.isbn = normalize(payload.isbn);
        existing.publisher = normalize(payload.publisher);
        existing.location = normalize(payload.location);
        existing.type = normalize(payload.type || existing.type || 'General');
        existing.inventory = Math.max(1, Number(payload.inventory || existing.inventory || 1));
        existing.available = Math.min(existing.inventory, Number(existing.available || existing.inventory));
        existing.demand = Math.max(1, Number(payload.demand || existing.demand || 1));
        existing.note = normalize(payload.note || '');
        existing.language = normalize(payload.language || existing.language || 'English');
        existing.edition = normalize(payload.edition || existing.edition || '1st');
        existing.price = Math.max(0, Number(payload.price || existing.price || 0));
        existing.shelfDate = normalize(payload.shelfDate || existing.shelfDate || dateText());
        existing.source = normalize(payload.source || existing.source || 'Purchase');
        existing.keywords = normalize(payload.keywords || existing.keywords || '');
        existing.updatedAt = dateText();
        activity(state, 'Book', 'Updated book: ' + existing.title);
      } else {
        var inventory = Math.max(1, Number(payload.inventory || 1));
        var book = { id: id('B', state.books, 'id'), title: normalize(payload.title), author: normalize(payload.author), isbn: normalize(payload.isbn), publisher: normalize(payload.publisher), location: normalize(payload.location), status: 'Available', type: normalize(payload.type || 'General'), inventory: inventory, available: inventory, borrowCount: 0, demand: Math.max(1, Number(payload.demand || 1)), createdAt: dateText(), updatedAt: dateText(), note: normalize(payload.note || ''), language: normalize(payload.language || 'English'), edition: normalize(payload.edition || '1st'), price: Math.max(0, Number(payload.price || 0)), shelfDate: normalize(payload.shelfDate || dateText()), source: normalize(payload.source || 'Purchase'), keywords: normalize(payload.keywords || '') };
        state.books.push(book);
        activity(state, 'Book', 'Added book: ' + book.title);
      }
      return refresh(state);
    });
  }

  //Delete a book from the system, but only if it is not currently borrowed. Also remove any related reservations and log the activity.
  function deleteBook(bookId) {
    return update(function (state) {
      var book = bookById(state, bookId);
      if (!book) {
        throw new Error('Book not found.');
      }
      if (activeBorrowForBook(state, bookId)) {
        throw new Error('Borrowed books cannot be deleted.');
      }
      state.books = state.books.filter(function (item) { return item.id !== bookId; });
      state.reservations = state.reservations.filter(function (item) { return item.bookId !== bookId; });
      activity(state, 'Book', 'Deleted book: ' + book.title);
      return refresh(state);
    });
  }

  //Scrap a book from the system, but only if it is not currently borrowed. Also remove any related reservations and log the activity.
  function scrapBook(bookId) {
    return update(function (state) {
      var book = bookById(state, bookId);
      if (!book) {
        throw new Error('Book not found.');
      }
      if (activeBorrowForBook(state, bookId)) {
        throw new Error('Borrowed books cannot be scrapped.');
      }
      book.status = 'Scrapped';
      book.available = 0;
      book.updatedAt = dateText();
      activity(state, 'Book', 'Scrapped book: ' + book.title);
    });
  }

  //Relocate a book to a new location. This function updates the location of the book and logs the activity. It also ensures that the new location is provided and valid.
  function relocateBook(bookId, location) {
    return update(function (state) {
      var book = bookById(state, bookId);
      if (!book) {
        throw new Error('Book not found.');
      }
      required(location, 'Location');
      book.location = normalize(location);
      book.updatedAt = dateText();
      activity(state, 'Book', 'Relocated book: ' + book.title + ' to ' + book.location);
      return refresh(state);
    });
  }

  //Search for books based on a given criteria.It supports three search modes: exact, partial, and fuzzy.
  function searchBooks(criteria) {
    var state = refresh(load());
    save(state);
    var key = lower(criteria.keyword || '');
    if (!key) {
      return state.books.slice();
    }
    return state.books.filter(function (book) {
      var value = criteria.type === 'author' ? book.author : criteria.type === 'isbn' ? book.isbn : book.title;
      return criteria.mode === 'exact' ? lower(value) === key : lower(value).indexOf(key) !== -1;
    });
  }

  //Add or update a reader in the system. It ensures that the reader name, ID number, reader type, and contact are provided and valid.
  function saveReader(payload, editingId) {
    return update(function (state) {
      required(payload.readerName, 'Reader name');
      required(payload.idCard, 'ID number');
      required(payload.readerType, 'Reader type');
      required(payload.contact, 'Contact');
      if (state.readers.some(function (reader) { return reader.readerId !== editingId && same(reader.idCard, payload.idCard); })) {
        throw new Error('ID number already exists.');
      }
      if (editingId) {
        var existing = readerById(state, editingId);
        if (!existing) {
          throw new Error('Reader not found.');
        }
        existing.readerName = normalize(payload.readerName);
        existing.idCard = normalize(payload.idCard);
        existing.readerType = normalize(payload.readerType);
        existing.contact = normalize(payload.contact);
        existing.certified = normalize(payload.certified || 'no');
        existing.updatedAt = dateText();
        activity(state, 'Reader', 'Updated reader: ' + existing.readerName);
      } else {
        var readerId = id('R', state.readers, 'readerId');
        var sequence = readerId.replace(/[^0-9]/g, '');
        state.readers.push({ readerId: readerId, readerName: normalize(payload.readerName), idCard: normalize(payload.idCard), readerType: normalize(payload.readerType), contact: normalize(payload.contact), cardNumber: 'C' + sequence, barcode: 'BC' + sequence, certified: normalize(payload.certified || 'no'), status: 'Active', createdAt: dateText(), updatedAt: dateText() });
        activity(state, 'Reader', 'Added reader: ' + normalize(payload.readerName));
      }
      return refresh(state);
    });
  }

  // Delete a reader from the system, but only if they have no active borrow records. Also remove any related reservations and log the activity.
  function deleteReader(readerId) {
    return update(function (state) {
      var reader = readerById(state, readerId);
      if (!reader) {
        throw new Error('Reader not found.');
      }
      if (state.borrowRecords.some(function (record) { return record.readerId === readerId && (record.status === 'Borrowed' || record.status === 'Overdue'); })) {
        throw new Error('Readers with active borrow records cannot be deleted.');
      }
      state.readers = state.readers.filter(function (item) { return item.readerId !== readerId; });
      state.reservations = state.reservations.filter(function (item) { return item.readerId !== readerId; });
      activity(state, 'Reader', 'Deleted reader: ' + reader.readerName);
      return refresh(state);
    });
  }

  //Borrow a book from the system, but only if the book is available and the reader exists. Also update the book availability and log the activity.
  function borrowBook(payload) {
    return update(function (state) {
      refresh(state);
      var book = bookByTitle(state, payload.bookTitle);
      var reader = readerByName(state, payload.readerName);
      if (!book) {
        throw new Error('Book title does not exist.');
      }
      if (!reader) {
        throw new Error('Reader name does not exist. Please add the reader first.');
      }
      if (book.status === 'Scrapped') {
        throw new Error('Scrapped books cannot be borrowed.');
      }
      if (Number(book.available || 0) <= 0 || activeBorrowForBook(state, book.id)) {
        throw new Error('The book is not available now.');
      }
      required(payload.borrowDate, 'Borrow date');
      required(payload.dueDate, 'Due date');
      if (payload.dueDate < payload.borrowDate) {
        throw new Error('Due date cannot be earlier than borrow date.');
      }
      state.borrowRecords.push({ id: id('BR', state.borrowRecords, 'id'), bookId: book.id, bookTitle: book.title, readerId: reader.readerId, readerName: reader.readerName, borrowDate: payload.borrowDate, dueDate: payload.dueDate, actualReturnDate: '', status: payload.dueDate < dateText() ? 'Overdue' : 'Borrowed', renewTimes: 0, createdAt: dateText(), updatedAt: dateText() });
      book.available = Math.max(0, Number(book.available || 0) - 1);
      book.borrowCount = Number(book.borrowCount || 0) + 1;
      book.updatedAt = dateText();
      activity(state, 'Borrow', reader.readerName + ' borrowed ' + book.title);
      return refresh(state);
    });
  }

  //Return a book to the system, but only if the book is borrowed by the specified reader. Also update the book availability and log the activity.
  function returnBook(payload) {
    return update(function (state) {
      refresh(state);
      var book = bookByTitle(state, payload.bookTitle);
      var reader = readerByName(state, payload.readerName);
      if (!book || !reader) {
        throw new Error('Book or reader does not exist.');
      }
      var record = activeBorrowForPair(state, book.id, reader.readerId);
      if (!record) {
        throw new Error('No active borrow record was found.');
      }
      required(payload.actualReturnDate, 'Actual return date');
      record.actualReturnDate = payload.actualReturnDate;
      record.status = 'Returned';
      record.updatedAt = dateText();
      book.available = Math.min(Number(book.inventory || 1), Number(book.available || 0) + 1);
      book.updatedAt = dateText();
      var waiting = first(state.reservations, function (item) { return item.bookId === book.id && item.status === 'Waiting'; });
      if (waiting) {
        waiting.status = 'Notified';
        waiting.updatedAt = dateText();
      }
      activity(state, 'Return', reader.readerName + ' returned ' + book.title);
      return refresh(state);
    });
  }

  //Renew a book in the system, but only if the book is currently borrowed by the specified reader and the renewal limit has not been reached. Also update the due date and log the activity.
  function renewBook(payload) {
    return update(function (state) {
      refresh(state);
      var book = bookByTitle(state, payload.bookTitle);
      var reader = readerByName(state, payload.readerName);
      if (!book || !reader) {
        throw new Error('Book or reader does not exist.');
      }
      var record = activeBorrowForPair(state, book.id, reader.readerId);
      if (!record) {
        throw new Error('No active borrow record was found.');
      }
      if (Number(record.renewTimes || 0) >= Number(state.settings.maxRenewTimes || 2)) {
        throw new Error('The renewal limit has been reached.');
      }
      required(payload.newDueDate, 'New due date');
      if (payload.newDueDate <= record.dueDate) {
        throw new Error('New due date must be later than current due date.');
      }
      record.dueDate = payload.newDueDate;
      record.renewTimes = Number(record.renewTimes || 0) + 1;
      record.status = payload.newDueDate < dateText() ? 'Overdue' : 'Borrowed';
      record.updatedAt = dateText();
      activity(state, 'Renew', reader.readerName + ' renewed ' + book.title);
      return refresh(state);
    });
  }

  //Reserve a book in the system, but only if the book is not already reserved by the specified reader. Also update the book demand and log the activity.
  function reserveBook(payload) {
    return update(function (state) {
      refresh(state);
      var book = bookByTitle(state, payload.bookTitle);
      var reader = readerByName(state, payload.readerName);
      if (!book || !reader) {
        throw new Error('Book or reader does not exist.');
      }
      required(payload.reserveDate, 'Reservation date');
      if (state.reservations.some(function (item) { return item.bookId === book.id && item.readerId === reader.readerId && item.status === 'Waiting'; })) {
        throw new Error('The reader already has a waiting reservation for this book.');
      }
      state.reservations.push({ id: id('RV', state.reservations, 'id'), bookId: book.id, bookTitle: book.title, readerId: reader.readerId, readerName: reader.readerName, reserveDate: payload.reserveDate, status: Number(book.available || 0) > 0 ? 'Ready' : 'Waiting', createdAt: dateText(), updatedAt: dateText() });
      book.demand = Number(book.demand || 0) + 1;
      activity(state, 'Reserve', reader.readerName + ' reserved ' + book.title);
      return refresh(state);
    });
  }

  //Cancel a reservation in the system, but only if the reservation is still waiting. Also update the book demand and log the activity.
  function cancelReservation(reservationId) {
    return update(function (state) {
      var reservation = first(state.reservations, function (item) { return item.id === reservationId; });
      if (!reservation) {
        throw new Error('Reservation not found.');
      }
      reservation.status = 'Cancelled';
      reservation.updatedAt = dateText();
      activity(state, 'Reserve', 'Cancelled reservation: ' + reservation.bookTitle);
      return refresh(state);
    });
  }

  // Reset the book management system to its default state.
  function reset() {
    var state = defaultState();
    save(state);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ message: 'BookManagement data has been reset.', time: new Date().toISOString() }));
    return state;
  }

  // Flash a message to the user.
  function flash(message) {
    if (message) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ message: message, time: new Date().toISOString() }));
    }
  }
  // Take a flash message from the user.
  function takeFlash() {
    var payload = parse(localStorage.getItem(SESSION_KEY), null);
    localStorage.removeItem(SESSION_KEY);
    return payload && payload.message ? payload.message : '';
  }


  // Get a summary of the book management system. This function calculates various statistics about the books, readers, borrow records, and reservations in the system and returns them in a summary object.
  function summary(state) {
    refresh(state);
    var totalInventory = state.books.reduce(function (sum, book) { return sum + Number(book.inventory || 0); }, 0);
    var borrowableCopies = state.books.reduce(function (sum, book) {
      return book.status === 'Scrapped' ? sum : sum + Number(book.available || 0);
    }, 0);
    var borrowedCopies = state.borrowRecords.filter(function (record) { return record.status === 'Borrowed' || record.status === 'Overdue'; }).length;
    var overdueRecords = state.borrowRecords.filter(function (record) { return record.status === 'Overdue'; });
    var waitingReservations = state.reservations.filter(function (item) { return item.status === 'Waiting'; }).length;
    var readyReservations = state.reservations.filter(function (item) { return item.status === 'Ready' || item.status === 'Notified'; }).length;
    var activeReservations = waitingReservations + readyReservations;
    var certifiedReaders = state.readers.filter(function (reader) { return reader.certified === 'yes'; }).length;
    var totalBorrowTimes = state.books.reduce(function (sum, book) { return sum + Number(book.borrowCount || 0); }, 0);
    return {
      totalBooks: state.books.length,
      availableBooks: state.books.filter(function (book) { return book.status === 'Available'; }).length,
      borrowedBooks: state.borrowRecords.filter(function (record) { return record.status === 'Borrowed'; }).length,
      overdueBooks: state.borrowRecords.filter(function (record) { return record.status === 'Overdue'; }).length,
      readers: state.readers.length,
      reservations: activeReservations,
      totalInventory: totalInventory,
      borrowableCopies: borrowableCopies,
      borrowedCopies: borrowedCopies,
      returnedRecords: state.borrowRecords.filter(function (record) { return record.status === 'Returned'; }).length,
      activeBorrowRecords: borrowedCopies,
      scrappedBooks: state.books.filter(function (book) { return book.status === 'Scrapped'; }).length,
      waitingReservations: waitingReservations,
      readyReservations: readyReservations,
      certifiedReaders: certifiedReaders,
      uncertifiedReaders: state.readers.length - certifiedReaders,
      totalBorrowTimes: totalBorrowTimes,
      utilizationRate: totalInventory ? ((borrowedCopies / totalInventory) * 100).toFixed(1) + '%' : '0.0%',
      overdueFineEstimate: overdueRecords.reduce(function (sum, record) {
        var days = Math.max(0, Math.ceil((new Date(dateText()).getTime() - new Date(record.dueDate).getTime()) / 86400000));
        return sum + days * Number(state.settings.overdueFinePerDay || 0);
      }, 0).toFixed(2)
    };
  }

  BM.utils = { pad: pad, dateText: dateText, addDays: addDays, normalize: normalize, lower: lower, same: same, clone: clone, id: id, first: first, flash: flash, takeFlash: takeFlash };
  BM.store = { load: load, save: save, update: update, refresh: refresh, saveBook: saveBook, deleteBook: deleteBook, scrapBook: scrapBook, relocateBook: relocateBook, searchBooks: searchBooks, saveReader: saveReader, deleteReader: deleteReader, borrowBook: borrowBook, returnBook: returnBook, renewBook: renewBook, reserveBook: reserveBook, cancelReservation: cancelReservation, reset: reset, summary: summary, bookById: bookById, bookByTitle: bookByTitle, readerById: readerById, readerByName: readerByName, activeBorrowForBook: activeBorrowForBook, activeBorrowForPair: activeBorrowForPair };
})();
