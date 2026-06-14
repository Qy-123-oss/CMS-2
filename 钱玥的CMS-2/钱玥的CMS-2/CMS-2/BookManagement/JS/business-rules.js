/* global window */
(function () {
  'use strict';

  var BM = window.BookManagement = window.BookManagement || {};
  var utils = BM.utils;

  function text(value) {
    return utils.normalize(value);
  }

  function lower(value) {
    return utils.lower(value);
  }

  function number(value, fallback) {
    var parsed = Number(value);
    if (isNaN(parsed)) {
      return fallback;
    }
    return parsed;
  }

  function integer(value, fallback) {
    return Math.floor(number(value, fallback));
  }

  function positiveInteger(value, fallback) {
    var parsed = integer(value, fallback);
    if (parsed < 1) {
      return fallback;
    }
    return parsed;
  }

  function money(value) {
    var parsed = number(value, 0);
    if (parsed < 0) {
      parsed = 0;
    }
    return Math.round(parsed * 100) / 100;
  }

  function isBlank(value) {
    return text(value) === '';
  }

  function hasLength(value, min, max) {
    var size = text(value).length;
    return size >= min && size <= max;
  }

  function hasOnlyDigits(value) {
    return /^[0-9]+$/.test(text(value));
  }

  function isValidIsbn(value) {
    var raw = text(value).replace(/-/g, '');
    if (raw.length !== 10 && raw.length !== 13) {
      return false;
    }
    return /^[0-9Xx]+$/.test(raw);
  }

  function isValidPhone(value) {
    var raw = text(value);
    return /^1[0-9]{10}$/.test(raw) || /^[0-9+\-\s]{6,20}$/.test(raw);
  }

  function isValidIdCard(value) {
    var raw = text(value);
    return /^[0-9]{15}$/.test(raw) || /^[0-9]{17}[0-9Xx]$/.test(raw);
  }

  function isValidDate(value) {
    var raw = text(value);
    var date;
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(raw)) {
      return false;
    }
    date = new Date(raw);
    return !isNaN(date.getTime());
  }

  function compareDate(a, b) {
    var first = new Date(a).getTime();
    var second = new Date(b).getTime();
    if (isNaN(first) || isNaN(second)) {
      return 0;
    }
    if (first < second) {
      return -1;
    }
    if (first > second) {
      return 1;
    }
    return 0;
  }

  function daysBetween(a, b) {
    var first = new Date(a).getTime();
    var second = new Date(b).getTime();
    if (isNaN(first) || isNaN(second)) {
      return 0;
    }
    return Math.ceil((second - first) / 86400000);
  }

  function pushError(errors, field, message) {
    errors.push({
      field: field,
      message: message
    });
  }

  function validationResult(errors) {
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  function requireField(errors, payload, field, label) {
    if (isBlank(payload[field])) {
      pushError(errors, field, label + ' is required.');
    }
  }

  function normalizeBookPayload(payload) {
    return {
      title: text(payload.title),
      author: text(payload.author),
      isbn: text(payload.isbn),
      publisher: text(payload.publisher),
      location: text(payload.location),
      type: text(payload.type || 'General'),
      inventory: positiveInteger(payload.inventory, 1),
      available: positiveInteger(payload.available || payload.inventory, positiveInteger(payload.inventory, 1)),
      demand: positiveInteger(payload.demand, 1),
      note: text(payload.note),
      language: text(payload.language || 'English'),
      edition: text(payload.edition || '1st'),
      price: money(payload.price),
      shelfDate: text(payload.shelfDate || utils.dateText()),
      source: text(payload.source || 'Purchase'),
      keywords: text(payload.keywords)
    };
  }

  function normalizeReaderPayload(payload) {
    return {
      readerName: text(payload.readerName),
      idCard: text(payload.idCard),
      readerType: text(payload.readerType),
      contact: text(payload.contact),
      certified: text(payload.certified || 'no')
    };
  }

  function normalizeBorrowPayload(payload) {
    return {
      bookTitle: text(payload.bookTitle),
      readerName: text(payload.readerName),
      borrowDate: text(payload.borrowDate),
      dueDate: text(payload.dueDate)
    };
  }

  function normalizeReturnPayload(payload) {
    return {
      bookTitle: text(payload.bookTitle),
      readerName: text(payload.readerName),
      actualReturnDate: text(payload.actualReturnDate)
    };
  }

  function normalizeRenewPayload(payload) {
    return {
      bookTitle: text(payload.bookTitle),
      readerName: text(payload.readerName),
      newDueDate: text(payload.newDueDate)
    };
  }

  function normalizeReservePayload(payload) {
    return {
      bookTitle: text(payload.bookTitle),
      readerName: text(payload.readerName),
      reserveDate: text(payload.reserveDate)
    };
  }

  function validateBook(payload, state, editingId) {
    var data = normalizeBookPayload(payload || {});
    var errors = [];
    requireField(errors, data, 'title', 'Title');
    requireField(errors, data, 'author', 'Author');
    requireField(errors, data, 'isbn', 'ISBN');
    requireField(errors, data, 'publisher', 'Publisher');
    requireField(errors, data, 'location', 'Location');
    if (data.title && !hasLength(data.title, 2, 120)) {
      pushError(errors, 'title', 'Title must be 2-120 characters.');
    }
    if (data.author && !hasLength(data.author, 2, 80)) {
      pushError(errors, 'author', 'Author must be 2-80 characters.');
    }
    if (data.isbn && !isValidIsbn(data.isbn)) {
      pushError(errors, 'isbn', 'ISBN must be 10 or 13 characters and contain only digits or X.');
    }
    if (data.inventory < 1) {
      pushError(errors, 'inventory', 'Inventory must be at least 1.');
    }
    if (data.available > data.inventory) {
      pushError(errors, 'available', 'Available copies cannot exceed inventory.');
    }
    if (data.shelfDate && !isValidDate(data.shelfDate)) {
      pushError(errors, 'shelfDate', 'Shelf date must use yyyy-mm-dd format.');
    }
    if (state && state.books) {
      state.books.forEach(function (book) {
        if (book.id !== editingId && lower(book.isbn) === lower(data.isbn)) {
          pushError(errors, 'isbn', 'ISBN already exists.');
        }
      });
    }
    return validationResult(errors);
  }

  function validateReader(payload, state, editingId) {
    var data = normalizeReaderPayload(payload || {});
    var errors = [];
    requireField(errors, data, 'readerName', 'Reader name');
    requireField(errors, data, 'idCard', 'ID number');
    requireField(errors, data, 'readerType', 'Reader type');
    requireField(errors, data, 'contact', 'Contact');
    if (data.readerName && !hasLength(data.readerName, 2, 40)) {
      pushError(errors, 'readerName', 'Reader name must be 2-40 characters.');
    }
    if (data.idCard && !isValidIdCard(data.idCard)) {
      pushError(errors, 'idCard', 'ID number format is invalid.');
    }
    if (data.contact && !isValidPhone(data.contact)) {
      pushError(errors, 'contact', 'Contact format is invalid.');
    }
    if (data.readerType !== 'student' && data.readerType !== 'teacher' && data.readerType !== 'visitor') {
      pushError(errors, 'readerType', 'Reader type must be student, teacher or visitor.');
    }
    if (data.certified !== 'yes' && data.certified !== 'no') {
      pushError(errors, 'certified', 'Certified must be yes or no.');
    }
    if (state && state.readers) {
      state.readers.forEach(function (reader) {
        if (reader.readerId !== editingId && lower(reader.idCard) === lower(data.idCard)) {
          pushError(errors, 'idCard', 'ID number already exists.');
        }
      });
    }
    return validationResult(errors);
  }

  function validateBorrow(payload, state) {
    var data = normalizeBorrowPayload(payload || {});
    var errors = [];
    var book = null;
    var reader = null;
    requireField(errors, data, 'bookTitle', 'Book title');
    requireField(errors, data, 'readerName', 'Reader name');
    requireField(errors, data, 'borrowDate', 'Borrow date');
    requireField(errors, data, 'dueDate', 'Due date');
    if (data.borrowDate && !isValidDate(data.borrowDate)) {
      pushError(errors, 'borrowDate', 'Borrow date must use yyyy-mm-dd format.');
    }
    if (data.dueDate && !isValidDate(data.dueDate)) {
      pushError(errors, 'dueDate', 'Due date must use yyyy-mm-dd format.');
    }
    if (data.borrowDate && data.dueDate && compareDate(data.borrowDate, data.dueDate) > 0) {
      pushError(errors, 'dueDate', 'Due date cannot be earlier than borrow date.');
    }
    if (state) {
      book = findBookByTitle(state, data.bookTitle);
      reader = findReaderByName(state, data.readerName);
      if (!book) {
        pushError(errors, 'bookTitle', 'Book does not exist.');
      }
      if (!reader) {
        pushError(errors, 'readerName', 'Reader does not exist.');
      }
      if (book && book.status === 'Scrapped') {
        pushError(errors, 'bookTitle', 'Scrapped books cannot be borrowed.');
      }
      if (book && number(book.available, 0) <= 0) {
        pushError(errors, 'bookTitle', 'No available copies.');
      }
      if (reader && hasReaderOverdueBooks(state, reader.readerId)) {
        pushError(errors, 'readerName', 'Reader has overdue books and cannot borrow more.');
      }
      if (reader && activeLoanCountByReader(state, reader.readerId) >= maxLoansForReader(reader)) {
        pushError(errors, 'readerName', 'Reader has reached the borrowing limit.');
      }
    }
    return validationResult(errors);
  }

  function validateReturn(payload, state) {
    var data = normalizeReturnPayload(payload || {});
    var errors = [];
    var book = null;
    var reader = null;
    requireField(errors, data, 'bookTitle', 'Book title');
    requireField(errors, data, 'readerName', 'Reader name');
    requireField(errors, data, 'actualReturnDate', 'Actual return date');
    if (data.actualReturnDate && !isValidDate(data.actualReturnDate)) {
      pushError(errors, 'actualReturnDate', 'Actual return date must use yyyy-mm-dd format.');
    }
    if (state) {
      book = findBookByTitle(state, data.bookTitle);
      reader = findReaderByName(state, data.readerName);
      if (!book || !reader) {
        pushError(errors, 'record', 'Book or reader does not exist.');
      } else if (!activeBorrowForPair(state, book.id, reader.readerId)) {
        pushError(errors, 'record', 'No active borrow record was found.');
      }
    }
    return validationResult(errors);
  }

  function validateRenew(payload, state) {
    var data = normalizeRenewPayload(payload || {});
    var errors = [];
    var book = null;
    var reader = null;
    var record = null;
    requireField(errors, data, 'bookTitle', 'Book title');
    requireField(errors, data, 'readerName', 'Reader name');
    requireField(errors, data, 'newDueDate', 'New due date');
    if (data.newDueDate && !isValidDate(data.newDueDate)) {
      pushError(errors, 'newDueDate', 'New due date must use yyyy-mm-dd format.');
    }
    if (state) {
      book = findBookByTitle(state, data.bookTitle);
      reader = findReaderByName(state, data.readerName);
      if (!book || !reader) {
        pushError(errors, 'record', 'Book or reader does not exist.');
      } else {
        record = activeBorrowForPair(state, book.id, reader.readerId);
        if (!record) {
          pushError(errors, 'record', 'No active borrow record was found.');
        } else {
          if (compareDate(record.dueDate, data.newDueDate) >= 0) {
            pushError(errors, 'newDueDate', 'New due date must be later than current due date.');
          }
          if (number(record.renewTimes, 0) >= number(state.settings.maxRenewTimes, 2)) {
            pushError(errors, 'renewTimes', 'Renewal limit has been reached.');
          }
        }
      }
    }
    return validationResult(errors);
  }

  function validateReserve(payload, state) {
    var data = normalizeReservePayload(payload || {});
    var errors = [];
    var book = null;
    var reader = null;
    requireField(errors, data, 'bookTitle', 'Book title');
    requireField(errors, data, 'readerName', 'Reader name');
    requireField(errors, data, 'reserveDate', 'Reservation date');
    if (data.reserveDate && !isValidDate(data.reserveDate)) {
      pushError(errors, 'reserveDate', 'Reservation date must use yyyy-mm-dd format.');
    }
    if (state) {
      book = findBookByTitle(state, data.bookTitle);
      reader = findReaderByName(state, data.readerName);
      if (!book) {
        pushError(errors, 'bookTitle', 'Book does not exist.');
      }
      if (!reader) {
        pushError(errors, 'readerName', 'Reader does not exist.');
      }
      if (book && reader && hasWaitingReservation(state, book.id, reader.readerId)) {
        pushError(errors, 'reservation', 'Reader already has a waiting reservation for this book.');
      }
    }
    return validationResult(errors);
  }

  function findBookByTitle(state, title) {
    var i;
    for (i = 0; i < state.books.length; i += 1) {
      if (lower(state.books[i].title) === lower(title)) {
        return state.books[i];
      }
    }
    return null;
  }

  function findReaderByName(state, name) {
    var i;
    for (i = 0; i < state.readers.length; i += 1) {
      if (lower(state.readers[i].readerName) === lower(name)) {
        return state.readers[i];
      }
    }
    return null;
  }

  function activeBorrowForPair(state, bookId, readerId) {
    var i;
    var record;
    for (i = 0; i < state.borrowRecords.length; i += 1) {
      record = state.borrowRecords[i];
      if (record.bookId === bookId && record.readerId === readerId && isActiveLoan(record)) {
        return record;
      }
    }
    return null;
  }

  function isActiveLoan(record) {
    return record.status === 'Borrowed' || record.status === 'Overdue';
  }

  function activeLoanCountByReader(state, readerId) {
    var count = 0;
    state.borrowRecords.forEach(function (record) {
      if (record.readerId === readerId && isActiveLoan(record)) {
        count += 1;
      }
    });
    return count;
  }

  function hasReaderOverdueBooks(state, readerId) {
    var overdue = false;
    state.borrowRecords.forEach(function (record) {
      if (record.readerId === readerId && record.status === 'Overdue') {
        overdue = true;
      }
    });
    return overdue;
  }

  function hasWaitingReservation(state, bookId, readerId) {
    var exists = false;
    state.reservations.forEach(function (reservation) {
      if (reservation.bookId === bookId && reservation.readerId === readerId && reservation.status === 'Waiting') {
        exists = true;
      }
    });
    return exists;
  }

  function maxLoansForReader(reader) {
    if (!reader) {
      return 0;
    }
    if (reader.readerType === 'teacher') {
      return 10;
    }
    if (reader.readerType === 'student') {
      return 5;
    }
    return 2;
  }

  function defaultBorrowDaysForReader(reader) {
    if (!reader) {
      return 30;
    }
    if (reader.readerType === 'teacher') {
      return 60;
    }
    if (reader.readerType === 'student') {
      return 30;
    }
    return 14;
  }

  function fineRateForReader(reader, settings) {
    var base = number(settings && settings.overdueFinePerDay, 0.5);
    if (reader && reader.readerType === 'teacher') {
      return Math.round(base * 0.5 * 100) / 100;
    }
    return base;
  }

  function loanPolicyForReader(reader, settings) {
    return {
      maxLoans: maxLoansForReader(reader),
      defaultBorrowDays: defaultBorrowDaysForReader(reader),
      maxRenewTimes: number(settings && settings.maxRenewTimes, 2),
      overdueFinePerDay: fineRateForReader(reader, settings)
    };
  }

  function calculateDueDate(borrowDate, reader) {
    var days = defaultBorrowDaysForReader(reader);
    var date = new Date(borrowDate);
    if (isNaN(date.getTime())) {
      date = new Date();
    }
    date.setDate(date.getDate() + days);
    return utils.dateText(date);
  }

  function calculateOverdueDays(record, today) {
    var now = today || utils.dateText();
    if (!record || !record.dueDate) {
      return 0;
    }
    return Math.max(0, daysBetween(record.dueDate, now));
  }

  function calculateFine(record, reader, settings, today) {
    var days = calculateOverdueDays(record, today);
    var rate = fineRateForReader(reader, settings);
    return Math.round(days * rate * 100) / 100;
  }

  function canBorrowBook(state, book, reader) {
    var errors = [];
    if (!book) {
      pushError(errors, 'book', 'Book does not exist.');
    }
    if (!reader) {
      pushError(errors, 'reader', 'Reader does not exist.');
    }
    if (book && book.status === 'Scrapped') {
      pushError(errors, 'book', 'Book has been scrapped.');
    }
    if (book && number(book.available, 0) <= 0) {
      pushError(errors, 'book', 'No available copies.');
    }
    if (reader && hasReaderOverdueBooks(state, reader.readerId)) {
      pushError(errors, 'reader', 'Reader has overdue books.');
    }
    if (reader && activeLoanCountByReader(state, reader.readerId) >= maxLoansForReader(reader)) {
      pushError(errors, 'reader', 'Borrow limit reached.');
    }
    return validationResult(errors);
  }

  function canDeleteBook(state, book) {
    var errors = [];
    if (!book) {
      pushError(errors, 'book', 'Book does not exist.');
    } else if (activeBorrowCountByBook(state, book.id) > 0) {
      pushError(errors, 'book', 'Book has active borrow records.');
    }
    return validationResult(errors);
  }

  function activeBorrowCountByBook(state, bookId) {
    var count = 0;
    state.borrowRecords.forEach(function (record) {
      if (record.bookId === bookId && isActiveLoan(record)) {
        count += 1;
      }
    });
    return count;
  }

  function canDeleteReader(state, reader) {
    var errors = [];
    if (!reader) {
      pushError(errors, 'reader', 'Reader does not exist.');
    } else if (activeLoanCountByReader(state, reader.readerId) > 0) {
      pushError(errors, 'reader', 'Reader has active borrow records.');
    }
    return validationResult(errors);
  }

  function updateBookStatusFromCopies(book) {
    if (!book) {
      return 'Unknown';
    }
    if (book.status === 'Scrapped') {
      return 'Scrapped';
    }
    if (number(book.available, 0) > 0) {
      return 'Available';
    }
    return 'Borrowed';
  }

  function deriveBookType(title, keywords) {
    var content = lower(title + ' ' + keywords);
    if (content.indexOf('computer') !== -1 || content.indexOf('java') !== -1 || content.indexOf('algorithm') !== -1) {
      return 'Computer Science';
    }
    if (content.indexOf('math') !== -1 || content.indexOf('algebra') !== -1 || content.indexOf('calculus') !== -1) {
      return 'Mathematics';
    }
    if (content.indexOf('english') !== -1 || content.indexOf('language') !== -1) {
      return 'English Learning';
    }
    if (content.indexOf('history') !== -1) {
      return 'History';
    }
    if (content.indexOf('literature') !== -1 || content.indexOf('novel') !== -1) {
      return 'Literature';
    }
    return 'General';
  }

  function buildLocation(area, shelf, index) {
    var safeArea = text(area || 'A').toUpperCase().charAt(0) || 'A';
    var safeShelf = positiveInteger(shelf, 1);
    var safeIndex = positiveInteger(index, 1);
    return safeArea + '-' + safeShelf + '-' + String(1000 + safeIndex).substring(1);
  }

  function parseLocation(location) {
    var parts = text(location).split('-');
    return {
      area: parts[0] || '',
      shelf: parts[1] || '',
      index: parts[2] || ''
    };
  }

  function referenceCatalog() {
    return [
      { title: 'Computer Networking', author: 'Xie Xiren', isbn: '9787111435623', type: 'Computer Science', publisher: 'Pearson Education', locationHint: 'A-1-001', keywords: 'network protocol tcp ip' },
      { title: 'Introduction to Algorithms', author: 'Thomas H. Cormen', isbn: '9787111221847', type: 'Computer Science', publisher: 'Pearson Education', locationHint: 'A-1-002', keywords: 'algorithm data structure' },
      { title: "Computer Systems: A Programmer's Perspective", author: 'Randal E. Bryant', isbn: '9787111435624', type: 'Computer Science', publisher: 'Pearson Education', locationHint: 'A-1-003', keywords: 'system architecture c' },
      { title: 'Core Java Technologies', author: 'Cay S. Horstmann', isbn: '9787111547425', type: 'Computer Science', publisher: 'China Machine Press', locationHint: 'A-2-001', keywords: 'java programming' },
      { title: 'Professional JavaScript for Web Developers', author: 'Matt Frisbie', isbn: '9781119366447', type: 'Computer Science', publisher: 'Wiley', locationHint: 'A-2-002', keywords: 'javascript web frontend' },
      { title: 'Data Structures and Algorithm Analysis', author: 'Mark Allen Weiss', isbn: '9780132576277', type: 'Computer Science', publisher: 'Pearson Education', locationHint: 'A-2-003', keywords: 'data structure algorithm' },
      { title: 'Advanced Mathematics', author: 'Tongji University', isbn: '9787040396614', type: 'Mathematics', publisher: 'Higher Education Press', locationHint: 'B-1-001', keywords: 'calculus mathematics' },
      { title: 'Linear Algebra', author: 'Gilbert Strang', isbn: '9780980232776', type: 'Mathematics', publisher: 'Wellesley Cambridge Press', locationHint: 'B-1-002', keywords: 'matrix vector algebra' },
      { title: 'College English Reading', author: 'Editorial Board', isbn: '9787560082216', type: 'English Learning', publisher: 'Foreign Language Teaching', locationHint: 'C-1-001', keywords: 'english reading' },
      { title: 'Modern Chinese Literature', author: 'Qian Liqun', isbn: '9787301047248', type: 'Literature', publisher: 'Peking University Press', locationHint: 'D-1-001', keywords: 'literature chinese' },
      { title: 'World History Overview', author: 'William McNeill', isbn: '9780393051797', type: 'History', publisher: 'Norton', locationHint: 'E-1-001', keywords: 'history world' },
      { title: 'Database System Concepts', author: 'Abraham Silberschatz', isbn: '9780073523323', type: 'Computer Science', publisher: 'McGraw Hill', locationHint: 'A-3-001', keywords: 'database sql transaction' },
      { title: 'Operating System Concepts', author: 'Abraham Silberschatz', isbn: '9781118063330', type: 'Computer Science', publisher: 'Wiley', locationHint: 'A-3-002', keywords: 'operating system process memory' },
      { title: 'Computer Organization and Design', author: 'David A. Patterson', isbn: '9780124077263', type: 'Computer Science', publisher: 'Morgan Kaufmann', locationHint: 'A-3-003', keywords: 'computer organization architecture' },
      { title: 'Discrete Mathematics and Its Applications', author: 'Kenneth H. Rosen', isbn: '9780073383095', type: 'Mathematics', publisher: 'McGraw Hill', locationHint: 'B-2-001', keywords: 'discrete mathematics logic graph' }
    ];
  }

  function findReferenceBook(keyword) {
    var list = referenceCatalog();
    var key = lower(keyword);
    var i;
    var item;
    if (!key) {
      return null;
    }
    for (i = 0; i < list.length; i += 1) {
      item = list[i];
      if (lower(item.isbn) === key) {
        return item;
      }
      if (lower(item.title).indexOf(key) !== -1) {
        return item;
      }
      if (lower(item.keywords).indexOf(key) !== -1) {
        return item;
      }
    }
    return null;
  }

  function suggestReferences(keyword, limit) {
    var list = referenceCatalog();
    var key = lower(keyword);
    var result = [];
    var i;
    var item;
    for (i = 0; i < list.length; i += 1) {
      item = list[i];
      if (!key || lower(item.title + ' ' + item.author + ' ' + item.isbn + ' ' + item.keywords).indexOf(key) !== -1) {
        result.push(item);
      }
      if (result.length >= positiveInteger(limit, 8)) {
        break;
      }
    }
    return result;
  }

  function firstErrorMessage(result) {
    if (!result || !result.errors || !result.errors.length) {
      return '';
    }
    return result.errors[0].message;
  }

  function throwIfInvalid(result) {
    if (result && !result.valid) {
      throw new Error(firstErrorMessage(result));
    }
  }

  BM.businessRules = {
    text: text,
    lower: lower,
    number: number,
    integer: integer,
    positiveInteger: positiveInteger,
    money: money,
    isBlank: isBlank,
    hasOnlyDigits: hasOnlyDigits,
    isValidIsbn: isValidIsbn,
    isValidPhone: isValidPhone,
    isValidIdCard: isValidIdCard,
    isValidDate: isValidDate,
    compareDate: compareDate,
    daysBetween: daysBetween,
    normalizeBookPayload: normalizeBookPayload,
    normalizeReaderPayload: normalizeReaderPayload,
    normalizeBorrowPayload: normalizeBorrowPayload,
    normalizeReturnPayload: normalizeReturnPayload,
    normalizeRenewPayload: normalizeRenewPayload,
    normalizeReservePayload: normalizeReservePayload,
    validateBook: validateBook,
    validateReader: validateReader,
    validateBorrow: validateBorrow,
    validateReturn: validateReturn,
    validateRenew: validateRenew,
    validateReserve: validateReserve,
    activeLoanCountByReader: activeLoanCountByReader,
    activeBorrowCountByBook: activeBorrowCountByBook,
    hasReaderOverdueBooks: hasReaderOverdueBooks,
    maxLoansForReader: maxLoansForReader,
    loanPolicyForReader: loanPolicyForReader,
    calculateDueDate: calculateDueDate,
    calculateOverdueDays: calculateOverdueDays,
    calculateFine: calculateFine,
    canBorrowBook: canBorrowBook,
    canDeleteBook: canDeleteBook,
    canDeleteReader: canDeleteReader,
    updateBookStatusFromCopies: updateBookStatusFromCopies,
    deriveBookType: deriveBookType,
    buildLocation: buildLocation,
    parseLocation: parseLocation,
    referenceCatalog: referenceCatalog,
    findReferenceBook: findReferenceBook,
    suggestReferences: suggestReferences,
    firstErrorMessage: firstErrorMessage,
    throwIfInvalid: throwIfInvalid
  };
})();
