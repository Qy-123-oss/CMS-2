/* global window, document */
(function () {
  'use strict';

  function ready(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
    } else {
      callback();
    }
  }

  ready(function () {
    var BM = window.BookManagement;
    if (BM.auth && !BM.auth.initPage()) {
      return;
    }
    var flash = BM.utils.takeFlash();
    if (BM.dataTools) {
      BM.dataTools.normalizeLocalState();
      BM.dataTools.installToolbar();
    } else {
      BM.store.save(BM.store.refresh(BM.store.load()));
    }
    if (BM.businessReports) {
      BM.latestReportPackage = BM.businessReports.dashboardPackage(BM.store.load());
    }
    if (BM.businessWorkflows) {
      BM.latestWorkflowSummary = BM.businessWorkflows.workflowSummary(BM.store.load());
    }
    BM.ui.resetButton();
    BM.ui.dashboardBookFall();
    BM.ui.dashboard();
    BM.books.initBookList();
    BM.books.initAddBook();
    BM.books.initQuery();
    BM.books.initBookDetail();
    BM.readers.init();
    BM.circulation.init();
    BM.statistics.render();
    BM.ui.decorateTextIcons();
    if (flash) {
      BM.ui.toast(flash);
    }
  });
})();
