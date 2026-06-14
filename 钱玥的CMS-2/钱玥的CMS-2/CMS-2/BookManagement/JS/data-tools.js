/* global window, document, Blob, URL */
(function () {
  'use strict';

  var BM = window.BookManagement = window.BookManagement || {};
  var rules = BM.businessRules;

  function parseJson(text) {
    try {
      return JSON.parse(text);
    } catch (error) {
      return null;
    }
  }

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeBook(book, index) {
    var payload = rules.normalizeBookPayload(book || {});
    payload.id = book.id || BM.utils.id('B', [], 'id') + '-' + index;
    payload.status = book.status || rules.updateBookStatusFromCopies(payload);
    payload.borrowCount = Number(book.borrowCount || 0);
    payload.createdAt = book.createdAt || BM.utils.dateText();
    payload.updatedAt = BM.utils.dateText();
    return payload;
  }

  function normalizeReader(reader, index) {
    var payload = rules.normalizeReaderPayload(reader || {});
    var sequence = String(index + 1);
    while (sequence.length < 3) {
      sequence = '0' + sequence;
    }
    payload.readerId = reader.readerId || 'R' + sequence;
    payload.cardNumber = reader.cardNumber || 'C' + sequence;
    payload.barcode = reader.barcode || 'BC' + sequence;
    payload.status = reader.status || 'Active';
    payload.createdAt = reader.createdAt || BM.utils.dateText();
    payload.updatedAt = BM.utils.dateText();
    return payload;
  }

  function normalizeBorrowRecord(record, index) {
    var sequence = String(index + 1);
    while (sequence.length < 3) {
      sequence = '0' + sequence;
    }
    return {
      id: record.id || 'BR' + sequence,
      bookId: record.bookId || '',
      bookTitle: record.bookTitle || '',
      readerId: record.readerId || '',
      readerName: record.readerName || '',
      borrowDate: record.borrowDate || BM.utils.dateText(),
      dueDate: record.dueDate || BM.utils.addDays(30),
      actualReturnDate: record.actualReturnDate || '',
      status: record.status || 'Borrowed',
      renewTimes: Number(record.renewTimes || 0),
      createdAt: record.createdAt || BM.utils.dateText(),
      updatedAt: record.updatedAt || BM.utils.dateText()
    };
  }

  function normalizeReservation(reservation, index) {
    var sequence = String(index + 1);
    while (sequence.length < 3) {
      sequence = '0' + sequence;
    }
    return {
      id: reservation.id || 'RV' + sequence,
      bookId: reservation.bookId || '',
      bookTitle: reservation.bookTitle || '',
      readerId: reservation.readerId || '',
      readerName: reservation.readerName || '',
      reserveDate: reservation.reserveDate || BM.utils.dateText(),
      status: reservation.status || 'Waiting',
      createdAt: reservation.createdAt || BM.utils.dateText(),
      updatedAt: reservation.updatedAt || BM.utils.dateText()
    };
  }

  function normalizeState(state) {
    var source = state || {};
    var result = {
      version: 2,
      books: [],
      readers: [],
      borrowRecords: [],
      reservations: [],
      activities: safeArray(source.activities),
      settings: source.settings || {
        defaultBorrowDays: 30,
        maxRenewTimes: 2,
        overdueFinePerDay: 0.5
      }
    };
    safeArray(source.books).forEach(function (book, index) {
      result.books.push(normalizeBook(book, index));
    });
    safeArray(source.readers).forEach(function (reader, index) {
      result.readers.push(normalizeReader(reader, index));
    });
    safeArray(source.borrowRecords).forEach(function (record, index) {
      result.borrowRecords.push(normalizeBorrowRecord(record, index));
    });
    safeArray(source.reservations).forEach(function (reservation, index) {
      result.reservations.push(normalizeReservation(reservation, index));
    });
    return result;
  }

  function normalizeLocalState() {
    var state = BM.store.load();
    var normalized = normalizeState(state);
    BM.store.save(BM.store.refresh(normalized));
    return normalized;
  }

  function healthCheck(state) {
    var messages = [];
    var isbnMap = {};
    var idCardMap = {};
    safeArray(state.books).forEach(function (book) {
      if (!rules.isValidIsbn(book.isbn)) {
        messages.push('Invalid ISBN: ' + book.title);
      }
      if (isbnMap[book.isbn]) {
        messages.push('Duplicate ISBN: ' + book.isbn);
      }
      isbnMap[book.isbn] = true;
      if (Number(book.available || 0) > Number(book.inventory || 0)) {
        messages.push('Available copies exceed inventory: ' + book.title);
      }
    });
    safeArray(state.readers).forEach(function (reader) {
      if (!rules.isValidIdCard(reader.idCard)) {
        messages.push('Invalid reader ID number: ' + reader.readerName);
      }
      if (idCardMap[reader.idCard]) {
        messages.push('Duplicate reader ID number: ' + reader.idCard);
      }
      idCardMap[reader.idCard] = true;
    });
    if (!messages.length) {
      messages.push('No data quality issues found.');
    }
    return messages;
  }

  function backupPayload(state) {
    return {
      exportedAt: new Date().toISOString(),
      module: 'BookManagement',
      version: 2,
      data: clone(state)
    };
  }

  function exportJson(state) {
    return JSON.stringify(backupPayload(state), null, 2);
  }

  function importJson(text) {
    var payload = parseJson(text);
    if (!payload) {
      throw new Error('Invalid JSON.');
    }
    if (payload.data) {
      return normalizeState(payload.data);
    }
    return normalizeState(payload);
  }

  function splitCsvLine(line) {
    var result = [];
    var current = '';
    var quoted = false;
    var i;
    var ch;
    for (i = 0; i < line.length; i += 1) {
      ch = line.charAt(i);
      if (ch === '"') {
        if (quoted && line.charAt(i + 1) === '"') {
          current += '"';
          i += 1;
        } else {
          quoted = !quoted;
        }
      } else if (ch === ',' && !quoted) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  }

  function parseCsv(text) {
    var lines = String(text || '').split(/\r?\n/).filter(function (line) {
      return line.trim() !== '';
    });
    var headers;
    var rows = [];
    if (!lines.length) {
      return rows;
    }
    headers = splitCsvLine(lines[0]);
    lines.slice(1).forEach(function (line) {
      var values = splitCsvLine(line);
      var row = {};
      headers.forEach(function (header, index) {
        row[header] = values[index] || '';
      });
      rows.push(row);
    });
    return rows;
  }

  function importBooksCsv(text, state) {
    var rows = parseCsv(text);
    var target = clone(state);
    rows.forEach(function (row) {
      var validation = rules.validateBook(row, target, '');
      if (validation.valid) {
        BM.store.saveBook(row, '');
      }
    });
    return rows.length;
  }

  function downloadText(filename, content, type) {
    var blob = new Blob([content], { type: type || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function installToolbar() {
    var BMRef = window.BookManagement;
    var host = document.querySelector('.user-info p');
    var exportButton;
    var checkButton;
    if (!host || document.querySelector('#bm-export-data') || (BMRef.auth && !BMRef.auth.isAdmin())) {
      return;
    }
    exportButton = document.createElement('button');
    exportButton.id = 'bm-export-data';
    exportButton.type = 'button';
    exportButton.textContent = 'Export';
    exportButton.style.marginLeft = '8px';
    exportButton.style.backgroundColor = '#409eff';
    exportButton.style.color = '#fff';
    exportButton.style.border = 'none';
    exportButton.style.borderRadius = '4px';
    exportButton.style.padding = '6px 12px';
    exportButton.style.cursor = 'pointer';
    exportButton.onclick = function () {
      downloadText('BookManagement-backup.json', exportJson(BMRef.store.load()), 'application/json;charset=utf-8');
    };
    checkButton = document.createElement('button');
    checkButton.id = 'bm-check-data';
    checkButton.type = 'button';
    checkButton.textContent = 'Check';
    checkButton.style.marginLeft = '8px';
    checkButton.style.backgroundColor = '#67c23a';
    checkButton.style.color = '#fff';
    checkButton.style.border = 'none';
    checkButton.style.borderRadius = '4px';
    checkButton.style.padding = '6px 12px';
    checkButton.style.cursor = 'pointer';
    checkButton.onclick = function () {
      BMRef.ui.toast(healthCheck(BMRef.store.load()).join(' '));
    };
    host.appendChild(exportButton);
    host.appendChild(checkButton);
  }

  BM.dataTools = {
    parseJson: parseJson,
    safeArray: safeArray,
    clone: clone,
    normalizeBook: normalizeBook,
    normalizeReader: normalizeReader,
    normalizeBorrowRecord: normalizeBorrowRecord,
    normalizeReservation: normalizeReservation,
    normalizeState: normalizeState,
    normalizeLocalState: normalizeLocalState,
    healthCheck: healthCheck,
    backupPayload: backupPayload,
    exportJson: exportJson,
    importJson: importJson,
    splitCsvLine: splitCsvLine,
    parseCsv: parseCsv,
    importBooksCsv: importBooksCsv,
    downloadText: downloadText,
    installToolbar: installToolbar
  };
})();
