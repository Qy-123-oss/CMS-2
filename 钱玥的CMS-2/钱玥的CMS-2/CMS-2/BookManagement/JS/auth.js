/* global window, document, localStorage, location */
(function () {
  'use strict';

  var BM = window.BookManagement = window.BookManagement || {};
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

  function renderUser() {
    var current = session();
    var host = document.querySelector('.user-info p');
    if (!current || !host) {
      return;
    }
    host.innerHTML = '';
    var label = document.createElement('span');
    label.className = 'bm-user-label';
    label.textContent = (current.role === 'admin' ? 'Admin' : 'User') + ': ' + current.name;
    var badge = document.createElement('span');
    badge.className = 'bm-role-badge bm-role-' + current.role;
    badge.textContent = current.role === 'admin' ? 'Back Office' : 'Front Office';
    var logout = document.createElement('button');
    logout.type = 'button';
    logout.textContent = 'Logout';
    logout.addEventListener('click', signOut);
    host.appendChild(label);
    host.appendChild(badge);
    host.appendChild(logout);
  }

  function filterMenu() {
    var current = session();
    if (!current || current.role === 'admin') {
      return;
    }
    Array.prototype.slice.call(document.querySelectorAll('.menu a')).forEach(function (link) {
      var target = (link.getAttribute('href') || '').toLowerCase();
      if (adminPages[target]) {
        link.parentNode.style.display = 'none';
      }
    });
  }

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
    Array.prototype.slice.call(document.querySelectorAll('[data-login-as]')).forEach(function (button) {
      button.addEventListener('click', function () {
        var role = button.getAttribute('data-login-as');
        document.querySelector('#username').value = role === 'admin' ? 'admin' : 'user';
        document.querySelector('#password').value = role === 'admin' ? 'admin123' : 'user123';
      });
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

  BM.auth = { session: session, isAdmin: isAdmin, signIn: signIn, signOut: signOut, initLogin: initLogin, initPage: initPage };
})();
