/* global window */
(function () {
  'use strict';

  var BM = window.BookManagement = window.BookManagement || {};
  var rules = BM.businessRules;

  function indexBooks(state) {
    var index = {};
    state.books.forEach(function (book) {
      addIndex(index, book.title, book.id);
      addIndex(index, book.author, book.id);
      addIndex(index, book.isbn, book.id);
      addIndex(index, book.publisher, book.id);
      addIndex(index, book.type, book.id);
      addIndex(index, book.keywords, book.id);
      addIndex(index, book.location, book.id);
    });
    return index;
  }

  function addIndex(index, value, id) {
    String(value || '').toLowerCase().split(/[\s,;:.-]+/).forEach(function (token) {
      if (!token) {
        return;
      }
      if (!index[token]) {
        index[token] = [];
      }
      if (index[token].indexOf(id) === -1) {
        index[token].push(id);
      }
    });
  }

  function searchIndex(state, keyword) {
    var index = indexBooks(state);
    var tokens = String(keyword || '').toLowerCase().split(/[\s,;:.-]+/);
    var scores = {};
    tokens.forEach(function (token) {
      var ids = index[token] || [];
      ids.forEach(function (id) {
        scores[id] = (scores[id] || 0) + 1;
      });
    });
    return Object.keys(scores).sort(function (a, b) {
      return scores[b] - scores[a];
    }).map(function (id) {
      return findBookById(state, id);
    }).filter(function (book) {
      return !!book;
    });
  }

  function findBookById(state, id) {
    var i;
    for (i = 0; i < state.books.length; i += 1) {
      if (state.books[i].id === id) {
        return state.books[i];
      }
    }
    return null;
  }

  function findReaderById(state, id) {
    var i;
    for (i = 0; i < state.readers.length; i += 1) {
      if (state.readers[i].readerId === id) {
        return state.readers[i];
      }
    }
    return null;
  }

  function nextBookLocation(state, area) {
    var maxShelf = 1;
    var maxIndex = 0;
    var targetArea = String(area || 'A').toUpperCase().charAt(0) || 'A';
    state.books.forEach(function (book) {
      var parsed = rules.parseLocation(book.location);
      if (parsed.area === targetArea) {
        maxShelf = Math.max(maxShelf, Number(parsed.shelf || 1));
        maxIndex = Math.max(maxIndex, Number(parsed.index || 0));
      }
    });
    if (maxIndex >= 999) {
      maxShelf += 1;
      maxIndex = 0;
    }
    return rules.buildLocation(targetArea, maxShelf, maxIndex + 1);
  }

  function planBatchShelf(state, books, area) {
    var plan = [];
    var workingState = BM.dataTools.clone(state);
    books.forEach(function (book) {
      var location = nextBookLocation(workingState, area || areaForType(book.type));
      plan.push({
        bookId: book.id,
        title: book.title,
        oldLocation: book.location || '',
        newLocation: location
      });
      workingState.books.push({
        id: book.id,
        location: location
      });
    });
    return plan;
  }

  function areaForType(type) {
    if (type === 'Computer Science') {
      return 'A';
    }
    if (type === 'Mathematics') {
      return 'B';
    }
    if (type === 'English Learning') {
      return 'C';
    }
    if (type === 'Literature') {
      return 'D';
    }
    if (type === 'History') {
      return 'E';
    }
    return 'G';
  }

  function applyShelfPlan(plan) {
    BM.store.update(function (state) {
      plan.forEach(function (item) {
        var book = findBookById(state, item.bookId);
        if (book) {
          book.location = item.newLocation;
          book.updatedAt = BM.utils.dateText();
        }
      });
      return BM.store.refresh(state);
    });
  }

  function fulfillReservation(reservationId) {
    return BM.store.update(function (state) {
      var reservation = findReservationById(state, reservationId);
      var book;
      var reader;
      if (!reservation) {
        throw new Error('Reservation not found.');
      }
      book = findBookById(state, reservation.bookId);
      reader = findReaderById(state, reservation.readerId);
      rules.throwIfInvalid(rules.validateBorrow({
        bookTitle: reservation.bookTitle,
        readerName: reservation.readerName,
        borrowDate: BM.utils.dateText(),
        dueDate: rules.calculateDueDate(BM.utils.dateText(), reader)
      }, state));
      state.borrowRecords.push({
        id: BM.utils.id('BR', state.borrowRecords, 'id'),
        bookId: book.id,
        bookTitle: book.title,
        readerId: reader.readerId,
        readerName: reader.readerName,
        borrowDate: BM.utils.dateText(),
        dueDate: rules.calculateDueDate(BM.utils.dateText(), reader),
        actualReturnDate: '',
        status: 'Borrowed',
        renewTimes: 0,
        createdAt: BM.utils.dateText(),
        updatedAt: BM.utils.dateText()
      });
      book.available = Math.max(0, Number(book.available || 0) - 1);
      book.borrowCount = Number(book.borrowCount || 0) + 1;
      reservation.status = 'Fulfilled';
      reservation.updatedAt = BM.utils.dateText();
      return BM.store.refresh(state);
    });
  }

  function findReservationById(state, reservationId) {
    var i;
    for (i = 0; i < state.reservations.length; i += 1) {
      if (state.reservations[i].id === reservationId) {
        return state.reservations[i];
      }
    }
    return null;
  }

  function createOverdueNotices(state) {
    var notices = [];
    state.borrowRecords.forEach(function (record) {
      var reader;
      var days;
      var fine;
      if (record.status !== 'Overdue') {
        return;
      }
      reader = findReaderById(state, record.readerId);
      days = rules.calculateOverdueDays(record);
      fine = rules.calculateFine(record, reader, state.settings);
      notices.push({
        type: 'Overdue',
        readerName: record.readerName,
        bookTitle: record.bookTitle,
        contact: reader ? reader.contact : '',
        dueDate: record.dueDate,
        overdueDays: days,
        fine: fine,
        message: record.readerName + ', please return "' + record.bookTitle + '". It is overdue by ' + days + ' day(s).'
      });
    });
    return notices;
  }

  function createReservationNotices(state) {
    var notices = [];
    state.reservations.forEach(function (reservation) {
      var reader;
      if (reservation.status !== 'Ready' && reservation.status !== 'Notified') {
        return;
      }
      reader = findReaderById(state, reservation.readerId);
      notices.push({
        type: 'Reservation',
        readerName: reservation.readerName,
        bookTitle: reservation.bookTitle,
        contact: reader ? reader.contact : '',
        reserveDate: reservation.reserveDate,
        message: reservation.readerName + ', your reserved book "' + reservation.bookTitle + '" is ready.'
      });
    });
    return notices;
  }

  function createInventoryTasks(state) {
    var tasks = [];
    BM.businessReports.stockoutBooks(state).forEach(function (book) {
      tasks.push({
        type: 'Purchase',
        priority: book.urgency,
        title: book.title,
        quantity: book.shortage,
        reason: 'Demand is higher than available copies.'
      });
    });
    BM.businessReports.overstockBooks(state).forEach(function (book) {
      tasks.push({
        type: 'Review',
        priority: 'Low',
        title: book.title,
        quantity: 0,
        reason: book.status
      });
    });
    return tasks;
  }

  function createDailyWorklist(state) {
    return {
      date: BM.utils.dateText(),
      overdueNotices: createOverdueNotices(state),
      reservationNotices: createReservationNotices(state),
      inventoryTasks: createInventoryTasks(state),
      dataQuality: BM.dataTools.healthCheck(state)
    };
  }

  function batchCreateBooks(rows) {
    var created = 0;
    var rejected = [];
    rows.forEach(function (row, index) {
      try {
        BM.store.saveBook(row, '');
        created += 1;
      } catch (error) {
        rejected.push({
          row: index + 1,
          title: row.title || '',
          reason: error.message
        });
      }
    });
    return {
      created: created,
      rejected: rejected
    };
  }

  function batchCreateReaders(rows) {
    var created = 0;
    var rejected = [];
    rows.forEach(function (row, index) {
      try {
        BM.store.saveReader(row, '');
        created += 1;
      } catch (error) {
        rejected.push({
          row: index + 1,
          readerName: row.readerName || '',
          reason: error.message
        });
      }
    });
    return {
      created: created,
      rejected: rejected
    };
  }

  function batchCancelReservations(ids) {
    var cancelled = 0;
    var failed = [];
    ids.forEach(function (id) {
      try {
        BM.store.cancelReservation(id);
        cancelled += 1;
      } catch (error) {
        failed.push({
          id: id,
          reason: error.message
        });
      }
    });
    return {
      cancelled: cancelled,
      failed: failed
    };
  }

  function circulationRiskScore(state) {
    var score = 0;
    score += BM.businessReports.overdueLoans(state).length * 5;
    score += BM.businessReports.stockoutBooks(state).length * 3;
    score += BM.businessReports.overstockBooks(state).length * 2;
    if (score > 100) {
      score = 100;
    }
    return score;
  }

  function circulationRiskLevel(state) {
    var score = circulationRiskScore(state);
    if (score >= 70) {
      return 'High';
    }
    if (score >= 35) {
      return 'Medium';
    }
    return 'Low';
  }

  function workflowSummary(state) {
    var worklist = createDailyWorklist(state);
    return {
      riskScore: circulationRiskScore(state),
      riskLevel: circulationRiskLevel(state),
      overdueNoticeCount: worklist.overdueNotices.length,
      reservationNoticeCount: worklist.reservationNotices.length,
      inventoryTaskCount: worklist.inventoryTasks.length,
      qualityMessageCount: worklist.dataQuality.length
    };
  }

  BM.businessWorkflows = {
    indexBooks: indexBooks,
    searchIndex: searchIndex,
    nextBookLocation: nextBookLocation,
    planBatchShelf: planBatchShelf,
    applyShelfPlan: applyShelfPlan,
    fulfillReservation: fulfillReservation,
    createOverdueNotices: createOverdueNotices,
    createReservationNotices: createReservationNotices,
    createInventoryTasks: createInventoryTasks,
    createDailyWorklist: createDailyWorklist,
    batchCreateBooks: batchCreateBooks,
    batchCreateReaders: batchCreateReaders,
    batchCancelReservations: batchCancelReservations,
    circulationRiskScore: circulationRiskScore,
    circulationRiskLevel: circulationRiskLevel,
    workflowSummary: workflowSummary
  };
})();
