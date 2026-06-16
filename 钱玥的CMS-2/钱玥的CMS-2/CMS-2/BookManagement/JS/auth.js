/* global window, document, localStorage, location */
(function () {
  'use strict';

  //AUTH_KEY: localStorage key for storing current session info
  var BM = window.BookManagement = window.BookManagement || {};
  var AUTH_KEY = 'cms_book_management_auth_v1';
  var LOGIN_PAGE = 'login.html';
  var accounts = [
    { username: 'admin', password: 'admin123', role: 'admin', name: 'Teacher Zhang' },
    { username: 'librarian', password: 'lib123', role: 'librarian', name: 'Library Staff' },
    { username: 'user', password: 'user123', role: 'user', name: 'Student User' }
  ];

  // Public pages need no login. Pages listed here require one of the allowed roles.
  var pageRoles = {
    'add-book.html': ['admin', 'librarian'],
    'borrow-management.html': ['admin', 'librarian'],
    'reader-management.html': ['admin', 'librarian'],
    'statistics.html': ['admin']
  };

  // Safely parse JSON string, return fallback value if parsing fails
  function parse(json, fallback) {
    try {
      return JSON.parse(json);
    } catch (error) {
      return fallback;
    }
  }
  // Get the current page name from URL path, e.g. 'login.html' or 'book-main.html'
  function page() {
    return (location.pathname.split('/').pop() || '').toLowerCase();
  }
  // Get the path to login page, depending on current page location
  function loginPath() {
    return page() === LOGIN_PAGE ? LOGIN_PAGE : '../' + LOGIN_PAGE;
  }
  // Get the path to main page, depending on current page location
  function mainPath() {
    return page() === LOGIN_PAGE ? 'Pages/book-main.html' : 'book-main.html';
  }
  // Get current session info from localStorage, return null if not logged in or invalid data
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

  function hasRole(roles) {
    var current = session();
    return !!current && roles.indexOf(current.role) !== -1;
  }

  function canAccess(pageName) {
    var allowed = pageRoles[String(pageName || '').toLowerCase()];
    if (!allowed) {
      return true;
    }
    return hasRole(allowed);
  }

  function canUseBackOffice() {
    return hasRole(['admin', 'librarian']);
  }

  function canManageBooks() {
    return hasRole(['admin', 'librarian']);
  }

  function canDeleteBooks() {
    return isAdmin();
  }

  function canResetData() {
    return isAdmin();
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
// Sign out the current user by removing session info from localStorage and redirecting to login page
  function signOut() {
    localStorage.removeItem(AUTH_KEY);
    location.href = mainPath();
  }

  // Public pages work like an official website. Operation pages require matching roles.
  function requireAuth() {
    if (page() === LOGIN_PAGE) {
      return true;
    }
    var current = session();
    if (pageRoles[page()]) {
      if (!current) {
        location.href = loginPath();
        return false;
      }
      if (!canAccess(page())) {
        location.href = 'book-main.html';
        return false;
      }
    }
    return true;
  }

  function renderUser() {
    var current = session();
    var host = document.querySelector('.user-info p');
    if (!host) {
      return;
    }
    host.innerHTML = '';
    if (!current) {
      var publicLabel = document.createElement('span');
      publicLabel.className = 'bm-user-label';
      publicLabel.textContent = 'Public Visitor';
      var login = document.createElement('button');
      login.type = 'button';
      login.textContent = 'Admin Login';
      login.addEventListener('click', function () {
        location.href = loginPath();
      });
      host.appendChild(publicLabel);
      host.appendChild(login);
      return;
    }
    var label = document.createElement('span');
    label.className = 'bm-user-label';
    label.textContent = roleLabel(current.role) + ': ' + current.name;
    var badge = document.createElement('span');
    badge.className = 'bm-role-badge bm-role-' + current.role;
    badge.textContent = current.role === 'admin' ? 'System Admin' : current.role === 'librarian' ? 'Library Operator' : 'Front Office';
    var logout = document.createElement('button');
    logout.type = 'button';
    logout.textContent = 'Logout';
    logout.addEventListener('click', signOut);
    host.appendChild(label);
    host.appendChild(badge);
    host.appendChild(logout);
  }
  function roleLabel(role) {
    return role === 'admin' ? 'Admin' : role === 'librarian' ? 'Librarian' : 'User';
  }

  // Hide menu items when the current role cannot access the target page.
  function filterMenu() {
    Array.prototype.slice.call(document.querySelectorAll('.menu a')).forEach(function (link) {
      var target = (link.getAttribute('href') || '').toLowerCase();
      if (!canAccess(target)) {
        link.parentNode.style.display = 'none';
      }
    });
  }

  // init login page
  function initLogin() {
    if (page() !== LOGIN_PAGE) {
      return;
    }
    var form = document.querySelector('#loginForm');
    var message = document.querySelector('#loginMessage');
    if (!form) {
      return;
    }
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      try {
        signIn(document.querySelector('#username').value, document.querySelector('#password').value);
        location.href = mainPath();
      } catch (error) {
        if (message) {
          message.textContent = error.message;
        }
      }
    });
  }

  function initPage() {
    if (!requireAuth()) {
      return false;
    }
    renderUser();
    filterMenu();
    return true;
  }

  BM.auth = { session: session, isAdmin: isAdmin, canAccess: canAccess, canUseBackOffice: canUseBackOffice, canManageBooks: canManageBooks, canDeleteBooks: canDeleteBooks, canResetData: canResetData, signIn: signIn, signOut: signOut, initLogin: initLogin, initPage: initPage };
})();
