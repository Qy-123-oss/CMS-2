/* global window, document, Vue */
(function () {
  'use strict';

  function ready(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
    } else {
      callback();
    }
  }

  function currentPage() {
    return (window.location.pathname.split('/').pop() || '').toLowerCase();
  }

  function initHome(BM) {
    var mount = document.querySelector('#book-main-app');
    if (currentPage() !== 'book-main.html' || !mount) {
      return false;
    }
    if (!window.Vue || !window.Vue.createApp) {
      return true;
    }
    Vue.createApp({
      data: function () {
        var state = BM.store.load();
        BM.store.refresh(state);
        BM.store.save(state);
        return {
          session: BM.auth ? BM.auth.session() : null,
          summary: BM.store.summary(state),
          updatedAt: new Date().toLocaleString(),
          functions: [
            ['Book List', 'View detailed information of all books in the collection'],
            ['Add New Book', 'Enter information of newly purchased books into the system'],
            ['Borrow Management', 'Handle book borrowing, returning, renewal and reservation'],
            ['Book Query', 'Quickly find the required books based on various conditions'],
            ['Reader Management', 'Maintain reader information and library cards'],
            ['Statistics Report', 'Generate various statistical data and analysis reports']
          ]
        };
      },
      computed: {
        isAdmin: function () {
          return !this.session || this.session.role === 'admin';
        },
        metrics: function () {
          if (!this.isAdmin) {
            return [
              ['Total Titles', this.summary.totalBooks, 'Collection size', 'blue'],
              ['Total Copies', this.summary.totalInventory, 'All physical copies', 'green'],
              ['Borrowable Titles', this.summary.availableBooks, 'Titles currently available', 'teal'],
              ['Borrowable Copies', this.summary.borrowableCopies, 'Copies ready to lend', 'mint'],
              ['Popular Borrows', this.summary.totalBorrowTimes, 'Total recorded borrow times', 'orange']
            ];
          }
          return [
            ['Total Titles', this.summary.totalBooks, 'Collection size', 'blue'],
            ['Total Copies', this.summary.totalInventory, 'All physical copies', 'green'],
            ['Borrowable Titles', this.summary.availableBooks, 'Titles currently available', 'teal'],
            ['Borrowable Copies', this.summary.borrowableCopies, 'Copies ready to lend', 'mint'],
            ['Borrowed Copies', this.summary.borrowedCopies, 'Active loans', 'orange'],
            ['Overdue Books', this.summary.overdueBooks, 'Need attention', 'red'],
            ['Readers', this.summary.readers, 'Registered users', 'violet'],
            ['Reservations', this.summary.reservations, 'Open requests', 'cyan'],
            ['Utilization', this.summary.utilizationRate, 'Current circulation rate', 'indigo'],
            ['Fine Estimate', '$' + this.summary.overdueFineEstimate, 'Estimated overdue fine', 'slate']
          ];
        }
      },
      template:
        '<div>' +
          '<div class="school-image-container">' +
            '<img src="../Images/school2.jpg" alt="School Image" class="school-image">' +
          '</div>' +
          '<div class="content-wrapper">' +
            '<div class="table-container">' +
              '<h2>Welcome to Library Management System</h2>' +
              '<div class="intro-content">' +
                '<p>The Library Management System is a comprehensive management platform designed specifically for libraries, aiming to improve book management efficiency, streamline borrowing processes, and provide comprehensive data statistics functions.</p>' +
                '<h3>System Functions Overview</h3>' +
                '<ol>' +
                  '<li v-for="item in functions" :key="item[0]"><strong>{{ item[0] }}</strong>: {{ item[1] }}</li>' +
                '</ol>' +
                '<p>The system features a clean and intuitive interface with convenient operations, allowing even first-time administrators to get started quickly.</p>' +
              '</div>' +
              '<div class="intro-video-container">' +
                '<video controls width="100%" style="border-radius: 4px;">' +
                  '<source src="../Images/introduction.mp4" type="video/mp4">' +
                  'Your browser does not support video playback.' +
                '</video>' +
              '</div>' +
            '</div>' +
            '<div class="bm-dashboard">' +
              '<div class="bm-dashboard-header">' +
                '<div>' +
                  '<p class="bm-dashboard-kicker">Library Overview</p>' +
                  '<h2>{{ isAdmin ? "Real-time Operation Panel" : "Reader Service Portal" }}</h2>' +
                  '<p class="bm-dashboard-subtitle">{{ isAdmin ? "Live data from localStorage, including collection, circulation, readers and reservation status." : "Front-office catalog view for book discovery and availability checks." }}</p>' +
                '</div>' +
                '<div class="bm-dashboard-date">Updated {{ updatedAt }}</div>' +
              '</div>' +
              '<div class="bm-metric-grid">' +
                '<div v-for="metric in metrics" :key="metric[0]" :class="\'bm-metric-card bm-metric-\' + metric[3]">' +
                  '<span class="bm-metric-label">{{ metric[0] }}</span>' +
                  '<strong class="bm-metric-value">{{ metric[1] }}</strong>' +
                  '<span class="bm-metric-note">{{ metric[2] }}</span>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>'
    }).mount('#book-main-app');
    return true;
  }

  ready(function () {
    var BM = window.BookManagement;
    if (BM.auth && !BM.auth.initPage()) {
      return;
    }
    var flash = BM.utils.takeFlash();
    BM.store.save(BM.store.refresh(BM.store.load()));
    initHome(BM);
    BM.books.initBookList();
    BM.books.initAddBook();
    BM.books.initQuery();
    BM.readers.init();
    BM.circulation.init();
    BM.statistics.render();
    if (flash) {
      BM.notify(flash);
    }
  });
})();
