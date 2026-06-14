/* global window, document, localStorage, location, Vue */
(function () {
  'use strict';

  var BM = window.BookManagement = window.BookManagement || {};
  var layoutVm = null;
  var AUTH_KEY = 'cms_book_management_auth_v1';
  var LOGIN_PAGE = 'login.html';
  var accounts = [
    { username: 'admin', password: 'admin123', role: 'admin', name: 'Teacher Zhang' },
    { username: 'user', password: 'user123', role: 'user', name: 'Student User' }
  ];
  var adminPages = {
    'add-book.html': true,
    'borrow-management.html': true,
    'reader-management.html': true,
    'statistics.html': true
  };
  var menuItems = [
    { href: 'book-main.html', text: 'Home' },
    { href: 'book-list.html', text: 'Book List' },
    { href: 'add-book.html', text: 'Add New Book', adminOnly: true },
    { href: 'borrow-management.html', text: 'Borrow Management', adminOnly: true },
    { href: 'query-books.html', text: 'Book Query' },
    { href: 'reader-management.html', text: 'Reader Management', adminOnly: true },
    { href: 'statistics.html', text: 'Statistics Report', adminOnly: true }
  ];

  function parse(json, fallback) {
    try {
      return JSON.parse(json);
    } catch (error) {
      return fallback;
    }
  }

  function page() {
    return (location.pathname.split('/').pop() || '').toLowerCase();
  }

  function loginPath() {
    return page() === LOGIN_PAGE ? LOGIN_PAGE : '../' + LOGIN_PAGE;
  }

  function mainPath() {
    return page() === LOGIN_PAGE ? 'Pages/book-main.html' : 'book-main.html';
  }

  function session() {
    var current = parse(localStorage.getItem(AUTH_KEY), null);
    if (!current || !current.username || !current.role) {
      return null;
    }
    return current;
  }

  function isAdmin() {
    var current = session();
    return !!current && current.role === 'admin';
  }

  function signIn(username, password) {
    var normalized = String(username || '').trim();
    var match = accounts.filter(function (account) {
      return account.username === normalized && account.password === String(password || '');
    })[0];
    if (!match) {
      throw new Error('Invalid username or password.');
    }
    localStorage.setItem(AUTH_KEY, JSON.stringify({
      username: match.username,
      role: match.role,
      name: match.name,
      loginAt: new Date().toISOString()
    }));
    return match;
  }

  function signOut() {
    localStorage.removeItem(AUTH_KEY);
    location.href = loginPath();
  }

  function notify(message, type) {
    if (!message) {
      return;
    }
    if (layoutVm && layoutVm.showToast) {
      layoutVm.showToast(message, type);
      return;
    }
    window.console[type === 'error' ? 'error' : 'log'](message);
  }

  function resetData() {
    if (!window.confirm('Reset all BookManagement localStorage data?')) {
      return;
    }
    if (BM.store && BM.store.reset) {
      BM.store.reset();
    }
    location.reload();
  }

  function requireAuth() {
    if (page() === LOGIN_PAGE) {
      return true;
    }
    var current = session();
    if (!current) {
      location.href = loginPath();
      return false;
    }
    if (adminPages[page()] && current.role !== 'admin') {
      location.href = 'book-main.html';
      return false;
    }
    return true;
  }

  function initLayout() {
    var mount = document.querySelector('#layout-app');
    var current = session();
    if (!mount || !current) {
      return false;
    }
    if (!window.Vue || !window.Vue.createApp) {
      return true;
    }
    layoutVm = Vue.createApp({
      data: function () {
        return {
          current: current,
          currentPage: page(),
          items: menuItems,
          fallingItems: Array.from({ length: 12 }, function (_, index) { return index + 1; }),
          toast: {
            message: '',
            type: '',
            visible: false,
            timer: null
          }
        };
      },
      computed: {
        visibleItems: function () {
          var isBackOffice = this.current.role === 'admin';
          return this.items.filter(function (item) {
            return isBackOffice || !item.adminOnly;
          });
        },
        roleLabel: function () {
          return this.current.role === 'admin' ? 'Admin' : 'User';
        },
        roleBadge: function () {
          return this.current.role === 'admin' ? 'Back Office' : 'Front Office';
        },
        canReset: function () {
          return this.current.role === 'admin' && BM.store && BM.store.reset;
        }
      },
      methods: {
        signOut: signOut,
        resetData: resetData,
        showToast: function (message, type) {
          var self = this;
          this.toast.message = message;
          this.toast.type = type || '';
          this.toast.visible = true;
          window.clearTimeout(this.toast.timer);
          this.toast.timer = window.setTimeout(function () {
            self.toast.visible = false;
          }, 2600);
        },
        isActive: function (item) {
          return item.href === this.currentPage;
        }
      },
      template:
        '<div>' +
          '<h1>' +
            '<div class="header-title">' +
              '<img src="../Images/logo.png" alt="Logo" class="logo">' +
              '<i>Library Management System</i>' +
            '</div>' +
            '<div class="user-info">' +
              '<p>' +
                '<span class="bm-user-label">{{ roleLabel }}: {{ current.name }}</span>' +
                '<span :class="\'bm-role-badge bm-role-\' + current.role">{{ roleBadge }}</span>' +
                '<button type="button" @click="signOut">Logout</button>' +
                '<button v-if="canReset" id="bm-reset-data" type="button" class="bm-reset-btn" @click="resetData">Reset Data</button>' +
              '</p>' +
            '</div>' +
          '</h1>' +
          '<div class="menu">' +
            '<h2>Menu</h2>' +
            '<ul>' +
              '<li v-for="item in visibleItems" :key="item.href">' +
                '<a :href="item.href" :class="{ active: isActive(item) }">{{ item.text }}</a>' +
              '</li>' +
            '</ul>' +
          '</div>' +
          '<div class="bm-bookfall" aria-hidden="true">' +
            '<span v-for="item in fallingItems" :key="item" :class="\'bm-falling-book bm-falling-book-\' + item"></span>' +
          '</div>' +
          '<div v-if="toast.visible" id="bm-toast" :class="toast.type === \'error\' ? \'bm-toast-error\' : \'bm-toast-success\'">{{ toast.message }}</div>' +
        '</div>'
    }).mount('#layout-app');
    return true;
  }

  function initLogin() {
    if (page() !== LOGIN_PAGE) {
      return;
    }
    var loginMount = document.querySelector('#login-app');
    if (window.Vue && window.Vue.createApp && loginMount) {
      Vue.createApp({
        data: function () {
          return {
            username: '',
            password: '',
            message: ''
          };
        },
        methods: {
          submit: function () {
            try {
              signIn(this.username, this.password);
              location.href = mainPath();
            } catch (error) {
              this.message = error.message;
            }
          },
          fillDemo: function (role) {
            this.username = role === 'admin' ? 'admin' : 'user';
            this.password = role === 'admin' ? 'admin123' : 'user123';
            this.message = '';
          }
        },
        template:
          '<main class="bm-login-shell">' +
            '<section class="bm-login-hero">' +
              '<div class="bm-school-mark" aria-label="Nanjing University of Information Science and Technology">' +
                '<img src="Images/logo.png" alt="Nanjing University of Information Science and Technology">' +
              '</div>' +
              '<div class="bm-hero-title">' +
                '<h1>Welcome to Library Management System</h1>' +
              '</div>' +
              '<div class="bm-login-brand">' +
                '<p><i class="fa-solid fa-book-open-reader" aria-hidden="true"></i> Use an administrator account for back-office circulation, reader and statistics management. Use a user account for front-office book browsing and search.</p>' +
              '</div>' +
            '</section>' +
            '<section class="bm-login-panel">' +
              '<div class="bm-login-card">' +
                '<h2><i class="fa-solid fa-id-card-clip bm-icon bm-icon-title" aria-hidden="true"></i> Account Login</h2>' +
                '<p><i class="fa-solid fa-circle-info bm-icon bm-icon-info" aria-hidden="true"></i> Select a role account to enter the matching system view.</p>' +
                '<form id="loginForm" action="#" method="post" @submit.prevent="submit">' +
                  '<div class="bm-login-field">' +
                    '<label for="username"><i class="fa-solid fa-user bm-icon bm-icon-user" aria-hidden="true"></i> Username</label>' +
                    '<input type="text" id="username" name="username" autocomplete="username" required v-model.trim="username">' +
                  '</div>' +
                  '<div class="bm-login-field">' +
                    '<label for="password"><i class="fa-solid fa-lock bm-icon bm-icon-lock" aria-hidden="true"></i> Password</label>' +
                    '<input type="password" id="password" name="password" autocomplete="current-password" required v-model="password">' +
                  '</div>' +
                  '<button type="submit" class="bm-login-submit"><i class="fa-solid fa-right-to-bracket bm-icon bm-icon-login" aria-hidden="true"></i> Login</button>' +
                  '<p id="loginMessage" class="bm-login-message" aria-live="polite">{{ message }}</p>' +
                '</form>' +
                '<div class="bm-login-demo">' +
                  '<button type="button" @click="fillDemo(\'admin\')"><i class="fa-solid fa-user-shield bm-icon bm-icon-admin" aria-hidden="true"></i> Admin Demo</button>' +
                  '<button type="button" @click="fillDemo(\'user\')"><i class="fa-solid fa-user-graduate bm-icon bm-icon-reader" aria-hidden="true"></i> User Demo</button>' +
                '</div>' +
                '<div class="bm-login-hint">' +
                  '<span><i class="fa-solid fa-key bm-icon bm-icon-key" aria-hidden="true"></i> Admin: admin / admin123</span>' +
                  '<span><i class="fa-solid fa-book bm-icon bm-icon-book" aria-hidden="true"></i> User: user / user123</span>' +
                '</div>' +
              '</div>' +
            '</section>' +
          '</main>'
      }).mount('#login-app');
      return;
    }
  }

  function initPage() {
    if (!requireAuth()) {
      return false;
    }
    initLayout();
    return true;
  }

  BM.notify = notify;
  BM.auth = { session: session, isAdmin: isAdmin, signIn: signIn, signOut: signOut, initLogin: initLogin, initPage: initPage, initLayout: initLayout };
})();
