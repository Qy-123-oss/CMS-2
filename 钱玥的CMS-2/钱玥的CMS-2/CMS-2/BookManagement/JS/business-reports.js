/* global window */
(function () {
  'use strict';

  var BM = window.BookManagement = window.BookManagement || {};
  var utils = BM.utils;
  var rules = BM.businessRules;

  function createCounter() {
    return {
      total: 0,
      available: 0,
      borrowed: 0,
      overdue: 0,
      scrapped: 0,
      demand: 0,
      borrowCount: 0
    };
  }

  function ensureBucket(map, key) {
    if (!map[key]) {
      map[key] = createCounter();
    }
    return map[key];
  }

  function inventoryByType(state) {
    var map = {};
    state.books.forEach(function (book) {
      var type = book.type || 'General';
      var bucket = ensureBucket(map, type);
      bucket.total += Number(book.inventory || 0);
      bucket.available += book.status === 'Scrapped' ? 0 : Number(book.available || 0);
      bucket.borrowed += Math.max(0, Number(book.inventory || 0) - Number(book.available || 0));
      bucket.demand += Number(book.demand || 0);
      bucket.borrowCount += Number(book.borrowCount || 0);
      if (book.status === 'Scrapped') {
        bucket.scrapped += 1;
      }
    });
    return mapToRows(map, 'type');
  }

  function inventoryByArea(state) {
    var map = {};
    state.books.forEach(function (book) {
      var location = rules.parseLocation(book.location);
      var area = location.area || 'Unknown';
      var bucket = ensureBucket(map, area);
      bucket.total += Number(book.inventory || 0);
      bucket.available += book.status === 'Scrapped' ? 0 : Number(book.available || 0);
      bucket.borrowed += Math.max(0, Number(book.inventory || 0) - Number(book.available || 0));
      bucket.demand += Number(book.demand || 0);
    });
    return mapToRows(map, 'area');
  }

  function mapToRows(map, keyName) {
    var rows = [];
    Object.keys(map).sort().forEach(function (key) {
      var bucket = map[key];
      var row = {};
      row[keyName] = key;
      row.total = bucket.total;
      row.available = bucket.available;
      row.borrowed = bucket.borrowed;
      row.overdue = bucket.overdue;
      row.scrapped = bucket.scrapped;
      row.demand = bucket.demand;
      row.borrowCount = bucket.borrowCount;
      row.rate = bucket.total ? Math.round((bucket.borrowed / bucket.total) * 1000) / 10 : 0;
      rows.push(row);
    });
    return rows;
  }

  function popularBooks(state, limit) {
    return state.books.slice().sort(function (a, b) {
      return Number(b.borrowCount || 0) - Number(a.borrowCount || 0);
    }).slice(0, limit || 10).map(function (book, index) {
      return {
        rank: index + 1,
        id: book.id,
        title: book.title,
        author: book.author,
        borrowCount: Number(book.borrowCount || 0),
        inventory: Number(book.inventory || 0),
        available: Number(book.available || 0),
        type: book.type || 'General'
      };
    });
  }

  function lowUsageBooks(state, limit) {
    return state.books.slice().filter(function (book) {
      return book.status !== 'Scrapped';
    }).sort(function (a, b) {
      return Number(a.borrowCount || 0) - Number(b.borrowCount || 0);
    }).slice(0, limit || 10).map(function (book) {
      return {
        id: book.id,
        title: book.title,
        author: book.author,
        inventory: Number(book.inventory || 0),
        borrowCount: Number(book.borrowCount || 0),
        status: Number(book.borrowCount || 0) === 0 ? 'No Borrowing' : 'Low Usage'
      };
    });
  }

  function stockoutBooks(state) {
    return state.books.filter(function (book) {
      return Number(book.demand || 0) > Number(book.available || 0) && book.status !== 'Scrapped';
    }).map(function (book) {
      var shortage = Math.max(0, Number(book.demand || 0) - Number(book.available || 0));
      return {
        id: book.id,
        title: book.title,
        author: book.author,
        demand: Number(book.demand || 0),
        available: Number(book.available || 0),
        shortage: shortage,
        urgency: shortage >= 3 ? 'Urgent' : 'Normal'
      };
    }).sort(function (a, b) {
      return b.shortage - a.shortage;
    });
  }

  function overstockBooks(state) {
    return state.books.filter(function (book) {
      return Number(book.inventory || 0) >= 5 && Number(book.borrowCount || 0) <= 1 && book.status !== 'Scrapped';
    }).map(function (book) {
      return {
        id: book.id,
        title: book.title,
        author: book.author,
        inventory: Number(book.inventory || 0),
        borrowCount: Number(book.borrowCount || 0),
        status: Number(book.borrowCount || 0) === 0 ? 'Severely Overstocked' : 'Overstocked'
      };
    });
  }

  function activeLoans(state) {
    return state.borrowRecords.filter(function (record) {
      return record.status === 'Borrowed' || record.status === 'Overdue';
    });
  }

  function overdueLoans(state) {
    return state.borrowRecords.filter(function (record) {
      return record.status === 'Overdue';
    }).map(function (record) {
      var reader = findReaderById(state, record.readerId);
      return {
        id: record.id,
        bookTitle: record.bookTitle,
        readerName: record.readerName,
        dueDate: record.dueDate,
        overdueDays: rules.calculateOverdueDays(record),
        fine: rules.calculateFine(record, reader, state.settings),
        renewTimes: Number(record.renewTimes || 0)
      };
    }).sort(function (a, b) {
      return b.overdueDays - a.overdueDays;
    });
  }

  function readerActivity(state) {
    var map = {};
    state.readers.forEach(function (reader) {
      map[reader.readerId] = {
        readerId: reader.readerId,
        readerName: reader.readerName,
        readerType: reader.readerType,
        borrowed: 0,
        returned: 0,
        overdue: 0,
        reservations: 0
      };
    });
    state.borrowRecords.forEach(function (record) {
      var row = map[record.readerId];
      if (row) {
        if (record.status === 'Returned') {
          row.returned += 1;
        } else if (record.status === 'Overdue') {
          row.overdue += 1;
          row.borrowed += 1;
        } else if (record.status === 'Borrowed') {
          row.borrowed += 1;
        }
      }
    });
    state.reservations.forEach(function (reservation) {
      var row = map[reservation.readerId];
      if (row && reservation.status !== 'Cancelled') {
        row.reservations += 1;
      }
    });
    return Object.keys(map).map(function (key) {
      return map[key];
    }).sort(function (a, b) {
      return b.borrowed + b.returned - a.borrowed - a.returned;
    });
  }

  function circulationTrend(state) {
    var map = {};
    state.borrowRecords.forEach(function (record) {
      var month = String(record.borrowDate || '').substring(0, 7);
      if (!map[month]) {
        map[month] = {
          month: month,
          borrowed: 0,
          returned: 0,
          overdue: 0,
          renewed: 0
        };
      }
      map[month].borrowed += 1;
      if (record.status === 'Returned') {
        map[month].returned += 1;
      }
      if (record.status === 'Overdue') {
        map[month].overdue += 1;
      }
      map[month].renewed += Number(record.renewTimes || 0);
    });
    return Object.keys(map).sort().map(function (key) {
      return map[key];
    });
  }

  function reservationQueue(state) {
    return state.reservations.slice().sort(function (a, b) {
      return rules.compareDate(a.reserveDate, b.reserveDate);
    }).map(function (reservation, index) {
      return {
        queueNo: index + 1,
        id: reservation.id,
        bookTitle: reservation.bookTitle,
        readerName: reservation.readerName,
        reserveDate: reservation.reserveDate,
        status: reservation.status
      };
    });
  }

  function purchaseRecommendations(state) {
    var rows = [];
    stockoutBooks(state).forEach(function (book) {
      rows.push({
        category: 'Popular Book Supplement',
        title: book.title,
        reason: 'Demand exceeds available copies',
        quantity: book.shortage,
        urgency: book.urgency
      });
    });
    overstockBooks(state).forEach(function (book) {
      rows.push({
        category: 'Elimination and Update',
        title: book.title,
        reason: book.status,
        quantity: 0,
        urgency: 'Low'
      });
    });
    return rows;
  }

  function dashboardPackage(state) {
    var totalInventory = 0;
    var available = 0;
    var scrapped = 0;
    state.books.forEach(function (book) {
      totalInventory += Number(book.inventory || 0);
      if (book.status !== 'Scrapped') {
        available += Number(book.available || 0);
      } else {
        scrapped += 1;
      }
    });
    return {
      summary: {
        titles: state.books.length,
        copies: totalInventory,
        available: available,
        activeLoans: activeLoans(state).length,
        overdue: overdueLoans(state).length,
        readers: state.readers.length,
        reservations: reservationQueue(state).filter(function (item) {
          return item.status !== 'Cancelled';
        }).length,
        scrapped: scrapped
      },
      inventoryByType: inventoryByType(state),
      inventoryByArea: inventoryByArea(state),
      popularBooks: popularBooks(state, 10),
      overdueLoans: overdueLoans(state),
      reservationQueue: reservationQueue(state),
      recommendations: purchaseRecommendations(state)
    };
  }

  function findReaderById(state, readerId) {
    var i;
    for (i = 0; i < state.readers.length; i += 1) {
      if (state.readers[i].readerId === readerId) {
        return state.readers[i];
      }
    }
    return null;
  }

  function toCsvValue(value) {
    var raw = String((typeof value === 'undefined' || value === null) ? '' : value);
    if (raw.indexOf('"') !== -1 || raw.indexOf(',') !== -1 || raw.indexOf('\n') !== -1) {
      return '"' + raw.replace(/"/g, '""') + '"';
    }
    return raw;
  }

  function rowsToCsv(headers, rows) {
    var lines = [];
    lines.push(headers.map(toCsvValue).join(','));
    rows.forEach(function (row) {
      lines.push(headers.map(function (header) {
        return toCsvValue(row[header]);
      }).join(','));
    });
    return lines.join('\n');
  }

  function exportBooksCsv(state) {
    var headers = ['id', 'title', 'author', 'isbn', 'publisher', 'location', 'status', 'type', 'inventory', 'available', 'borrowCount', 'demand'];
    return rowsToCsv(headers, state.books);
  }

  function exportReadersCsv(state) {
    var headers = ['readerId', 'readerName', 'idCard', 'readerType', 'contact', 'cardNumber', 'barcode', 'certified', 'status'];
    return rowsToCsv(headers, state.readers);
  }

  function exportBorrowCsv(state) {
    var headers = ['id', 'bookId', 'bookTitle', 'readerId', 'readerName', 'borrowDate', 'dueDate', 'actualReturnDate', 'status', 'renewTimes'];
    return rowsToCsv(headers, state.borrowRecords);
  }

  function qualityScore(state) {
    var score = 100;
    var overdue = overdueLoans(state).length;
    var stockout = stockoutBooks(state).length;
    var overstock = overstockBooks(state).length;
    score -= overdue * 4;
    score -= stockout * 3;
    score -= overstock * 2;
    if (score < 0) {
      score = 0;
    }
    return score;
  }

  function auditMessages(state) {
    var messages = [];
    if (overdueLoans(state).length > 0) {
      messages.push('There are overdue loans requiring follow-up.');
    }
    if (stockoutBooks(state).length > 0) {
      messages.push('Some books have demand greater than available copies.');
    }
    if (overstockBooks(state).length > 0) {
      messages.push('Some books have high inventory but low usage.');
    }
    if (!messages.length) {
      messages.push('Library data is currently stable.');
    }
    return messages;
  }

  BM.businessReports = {
    inventoryByType: inventoryByType,
    inventoryByArea: inventoryByArea,
    popularBooks: popularBooks,
    lowUsageBooks: lowUsageBooks,
    stockoutBooks: stockoutBooks,
    overstockBooks: overstockBooks,
    activeLoans: activeLoans,
    overdueLoans: overdueLoans,
    readerActivity: readerActivity,
    circulationTrend: circulationTrend,
    reservationQueue: reservationQueue,
    purchaseRecommendations: purchaseRecommendations,
    dashboardPackage: dashboardPackage,
    rowsToCsv: rowsToCsv,
    exportBooksCsv: exportBooksCsv,
    exportReadersCsv: exportReadersCsv,
    exportBorrowCsv: exportBorrowCsv,
    qualityScore: qualityScore,
    auditMessages: auditMessages
  };
})();
