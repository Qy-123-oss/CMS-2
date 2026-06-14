/* global window, location, confirm, prompt, Vue */
(function () {
  'use strict';

  var BM = window.BookManagement = window.BookManagement || {};
  var store = BM.store;

  function page() {
    return (location.pathname.split('/').pop() || '').toLowerCase();
  }

  function getQueryParam(name) {
    var query = location.search ? location.search.substring(1).split('&') : [];
    var i;
    var pair;
    for (i = 0; i < query.length; i += 1) {
      pair = query[i].split('=');
      if (decodeURIComponent(pair[0] || '') === name) {
        return decodeURIComponent((pair[1] || '').replace(/\+/g, ' '));
      }
    }
    return '';
  }

  function cloneBook(book) {
    return {
      title: book && book.title ? book.title : '',
      author: book && book.author ? book.author : '',
      isbn: book && book.isbn ? book.isbn : '',
      publisher: book && book.publisher ? book.publisher : '',
      location: book && book.location ? book.location : '',
      type: book && book.type ? book.type : 'General',
      inventory: book && book.inventory ? Number(book.inventory) : 1,
      demand: book && book.demand ? Number(book.demand) : 1,
      language: book && book.language ? book.language : 'English',
      edition: book && book.edition ? book.edition : '1st',
      price: book && book.price ? Number(book.price) : 0,
      shelfDate: book && book.shelfDate ? book.shelfDate : BM.utils.dateText(),
      source: book && book.source ? book.source : 'Purchase',
      keywords: book && book.keywords ? book.keywords : '',
      note: book && book.note ? book.note : ''
    };
  }

  function pillClass(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function cellClass(value, index) {
    var text = String(value === null || typeof value === 'undefined' ? '' : value);
    var isNumber = /^-?\d+(\.\d+)?$/.test(text);
    var isWord = /^[A-Za-z]+$/.test(text);
    if (!isNumber && !isWord) {
      return '';
    }
    return 'bm-table-pill ' + (isNumber ? 'bm-table-pill-number' : 'bm-table-pill-word') +
      ' bm-table-pill-col-' + index + ' bm-table-pill-value-' + pillClass(text);
  }

  function refreshBooks() {
    var state = store.load();
    store.refresh(state);
    store.save(state);
    return state.books;
  }

  function notify(message, type) {
    if (BM.notify) {
      BM.notify(message, type);
    }
  }

  function handle(error) {
    notify(error && error.message ? error.message : String(error), 'error');
  }

  function assertVue(mountId) {
    if (window.Vue && window.Vue.createApp) {
      return true;
    }
    return false;
  }

  var FormField = {
    props: ['field', 'modelValue'],
    emits: ['update:modelValue'],
    computed: {
      inputValue: {
        get: function () {
          return this.modelValue;
        },
        set: function (value) {
          this.$emit('update:modelValue', value);
        }
      }
    },
    template:
      '<p class="bm-form-row">' +
        '<label :for="field.id">{{ field.label }}</label>' +
        '<select v-if="field.options" :id="field.id" :name="field.id" v-model="inputValue" :required="field.required">' +
          '<option v-for="option in field.options" :key="option.value" :value="option.value">{{ option.label }}</option>' +
        '</select>' +
        '<input v-else :type="field.type || \'text\'" :id="field.id" :name="field.id" v-model="inputValue" :required="field.required" :placeholder="field.placeholder" :min="field.min" :step="field.step">' +
      '</p>'
  };

  var BookTable = {
    props: ['books', 'actions'],
    emits: ['edit-book', 'delete-book', 'scrap-book', 'relocate-book'],
    methods: {
      cellClass: cellClass,
      text: function (value) {
        return value === null || typeof value === 'undefined' ? '' : String(value);
      }
    },
    template:
      '<table :class="actions ? \'bm-actions-table\' : \'bm-readonly-table\'">' +
        '<thead>' +
          '<tr>' +
            '<th>Title</th>' +
            '<th>Author</th>' +
            '<th>ISBN</th>' +
            '<th>Publisher</th>' +
            '<th>Location</th>' +
            '<th>Status</th>' +
            '<th v-if="actions">Actions</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>' +
          '<tr v-if="!books.length">' +
            '<td :colspan="actions ? 7 : 6" class="bm-empty-row">No books found.</td>' +
          '</tr>' +
          '<tr v-for="book in books" :key="book.id">' +
            '<td v-for="(value, index) in [book.title, book.author, book.isbn, book.publisher, book.location, book.status]" :key="index">' +
              '<span v-if="cellClass(value, index)" :class="cellClass(value, index)">{{ text(value) }}</span>' +
              '<span v-else>{{ text(value) }}</span>' +
            '</td>' +
            '<td v-if="actions" class="bm-action-cell">' +
              '<button type="button" class="edit-btn" @click="$emit(\'edit-book\', book)">Edit</button>' +
              '<button type="button" class="delete-btn" @click="$emit(\'delete-book\', book)">Delete</button>' +
              '<button type="button" class="scrap-btn" @click="$emit(\'scrap-book\', book)">Scrap</button>' +
              '<button type="button" class="relocate-btn" @click="$emit(\'relocate-book\', book)">Relocate</button>' +
            '</td>' +
          '</tr>' +
        '</tbody>' +
      '</table>'
  };

  function initAddBook() {
    if (page() !== 'add-book.html' || !document.getElementById('book-add-app')) {
      return;
    }
    if (!assertVue('book-add-app')) {
      return;
    }

    var editingId = getQueryParam('edit');
    var editingBook = editingId ? store.bookById(store.load(), editingId) : null;

    Vue.createApp({
      components: { FormField: FormField },
      data: function () {
        return {
          editingId: editingId,
          form: cloneBook(editingBook),
          fields: [
            { id: 'book-title', key: 'title', label: 'Title:', required: true, placeholder: 'Please enter the book title' },
            { id: 'author', key: 'author', label: 'Author:', required: true, placeholder: 'Please enter the author' },
            { id: 'isbn', key: 'isbn', label: 'ISBN:', required: true, placeholder: 'Please enter the ISBN' },
            { id: 'publisher', key: 'publisher', label: 'Publisher:', required: true, placeholder: 'Please enter the publisher' },
            { id: 'location', key: 'location', label: 'Location:', required: true, placeholder: 'Please enter the storage location' },
            { id: 'book-type', key: 'type', label: 'Type:', required: true, placeholder: 'Please enter the book type' },
            { id: 'inventory', key: 'inventory', label: 'Inventory:', type: 'number', min: 1, required: true, placeholder: 'Please enter inventory' },
            { id: 'demand', key: 'demand', label: 'Demand:', type: 'number', min: 1, required: true, placeholder: 'Please enter demand' },
            { id: 'language', key: 'language', label: 'Language:', required: true, placeholder: 'Please enter language' },
            { id: 'edition', key: 'edition', label: 'Edition:', required: true, placeholder: 'Please enter edition' },
            { id: 'price', key: 'price', label: 'Price:', type: 'number', min: 0, step: '0.01', required: true, placeholder: 'Please enter price' },
            { id: 'shelf-date', key: 'shelfDate', label: 'Shelf Date:', type: 'date', required: true, placeholder: 'Please choose shelf date' },
            { id: 'source', key: 'source', label: 'Source:', options: [
              { value: 'Purchase', label: 'Purchase' },
              { value: 'Donation', label: 'Donation' },
              { value: 'Exchange', label: 'Exchange' }
            ] },
            { id: 'keywords', key: 'keywords', label: 'Keywords:', placeholder: 'Separate keywords with commas' },
            { id: 'note', key: 'note', label: 'Note:', placeholder: 'Optional note' }
          ]
        };
      },
      computed: {
        title: function () {
          return this.editingId ? 'Edit Book Information' : 'Add New Book Information';
        },
        submitText: function () {
          return this.editingId ? 'Update Book Information' : 'Save Book Information';
        }
      },
      methods: {
        payload: function () {
          return {
            title: this.form.title,
            author: this.form.author,
            isbn: this.form.isbn,
            publisher: this.form.publisher,
            location: this.form.location,
            type: this.form.type || 'General',
            inventory: Number(this.form.inventory || 1),
            demand: Number(this.form.demand || 1),
            language: this.form.language || 'English',
            edition: this.form.edition || '1st',
            price: Number(this.form.price || 0),
            shelfDate: this.form.shelfDate || BM.utils.dateText(),
            source: this.form.source || 'Purchase',
            keywords: this.form.keywords,
            note: this.form.note
          };
        },
        fillReference: function () {
          var keyword = String(this.form.isbn || this.form.title || '').toLowerCase();
          var item = BM.businessRules.findReferenceBook(keyword);
          if (!item) {
            notify('No matching reference item found.', 'error');
            return;
          }
          this.form.title = item.title;
          this.form.author = item.author;
          this.form.isbn = item.isbn;
          this.form.publisher = item.publisher;
          this.form.type = item.type;
          this.form.location = item.locationHint;
          this.form.keywords = item.keywords;
          notify('Reference data filled.');
        },
        submit: function () {
          try {
            if (BM.businessRules && BM.businessRules.validateBook) {
              BM.businessRules.throwIfInvalid(BM.businessRules.validateBook(this.payload(), store.load(), this.editingId));
            }
            store.saveBook(this.payload(), this.editingId);
            BM.utils.flash(this.editingId ? 'Book updated successfully.' : 'Book added successfully.');
            location.href = 'book-list.html';
          } catch (error) {
            handle(error);
          }
        }
      },
      template:
        '<div class="form-container">' +
          '<h2>{{ title }}</h2>' +
          '<form id="addBookForm" action="#" method="POST" @submit.prevent="submit">' +
            '<form-field v-for="field in fields" :key="field.key" :field="field" v-model="form[field.key]"></form-field>' +
            '<p class="bm-form-row bm-form-tools">' +
              '<label>Tools:</label>' +
              '<button type="button" class="relocate-btn" @click="fillReference">Fill from Reference</button>' +
            '</p>' +
            '<p class="bm-form-actions">' +
              '<input type="submit" :value="submitText">' +
            '</p>' +
          '</form>' +
          '<div class="image-container">' +
            '<img src="../Images/image.png" alt="Decorative Image" class="decorative-image">' +
          '</div>' +
        '</div>'
    }).mount('#book-add-app');
  }

  function initBookList() {
    if (page() !== 'book-list.html' || !document.getElementById('book-list-app')) {
      return;
    }
    if (!assertVue('book-list-app')) {
      return;
    }

    Vue.createApp({
      components: { BookTable: BookTable },
      data: function () {
        return {
          books: refreshBooks(),
          actions: !(BM.auth && !BM.auth.isAdmin())
        };
      },
      methods: {
        reload: function () {
          this.books = refreshBooks();
        },
        editBook: function (book) {
          location.href = 'add-book.html?edit=' + encodeURIComponent(book.id);
        },
        deleteBook: function (book) {
          if (!confirm('Delete book "' + book.title + '"?')) {
            return;
          }
          try {
            store.deleteBook(book.id);
            notify('Book deleted.');
            this.reload();
          } catch (error) {
            handle(error);
          }
        },
        scrapBook: function (book) {
          if (!confirm('Scrap book "' + book.title + '"?')) {
            return;
          }
          try {
            store.scrapBook(book.id);
            notify('Book scrapped.');
            this.reload();
          } catch (error) {
            handle(error);
          }
        },
        relocateBook: function (book) {
          var value = prompt('Input new location:', book.location);
          if (value === null) {
            return;
          }
          try {
            store.relocateBook(book.id, value);
            notify('Book relocated.');
            this.reload();
          } catch (error) {
            handle(error);
          }
        }
      },
      template:
        '<div class="table-container">' +
          '<h2>Book Information List</h2>' +
          '<book-table :books="books" :actions="actions" @edit-book="editBook" @delete-book="deleteBook" @scrap-book="scrapBook" @relocate-book="relocateBook"></book-table>' +
        '</div>'
    }).mount('#book-list-app');
  }

  function initQuery() {
    if (page() !== 'query-books.html' || !document.getElementById('book-query-app')) {
      return;
    }
    if (!assertVue('book-query-app')) {
      return;
    }

    Vue.createApp({
      components: { FormField: FormField, BookTable: BookTable },
      data: function () {
        return {
          criteria: {
            type: 'book-name',
            keyword: '',
            mode: 'fuzzy'
          },
          results: refreshBooks(),
          fields: [
            { id: 'search-type', key: 'type', label: 'Search Method:', options: [
              { value: 'book-name', label: 'Search by Book Title' },
              { value: 'author', label: 'Search by Author' },
              { value: 'isbn', label: 'Search by ISBN' }
            ] },
            { id: 'search-keyword', key: 'keyword', label: 'Search Keyword:', required: true, placeholder: 'Please enter search keyword' },
            { id: 'search-mode', key: 'mode', label: 'Search Mode:', options: [
              { value: 'fuzzy', label: 'Fuzzy Search' },
              { value: 'exact', label: 'Exact Search' }
            ] }
          ]
        };
      },
      methods: {
        search: function () {
          try {
            this.results = store.searchBooks({
              type: this.criteria.type,
              keyword: this.criteria.keyword,
              mode: this.criteria.mode
            });
            notify('Found ' + this.results.length + ' book(s).');
          } catch (error) {
            handle(error);
          }
        }
      },
      template:
        '<div>' +
          '<div class="form-container">' +
            '<h2>Book Query</h2>' +
            '<form id="searchForm" action="#" method="GET" @submit.prevent="search">' +
              '<form-field v-for="field in fields" :key="field.key" :field="field" v-model="criteria[field.key]"></form-field>' +
              '<p class="bm-form-actions"><input type="submit" value="Start Search"></p>' +
            '</form>' +
          '</div>' +
          '<div class="table-container">' +
            '<h2>Search Results</h2>' +
            '<book-table :books="results" :actions="false"></book-table>' +
          '</div>' +
        '</div>'
    }).mount('#book-query-app');
  }

  BM.books = { initAddBook: initAddBook, initBookList: initBookList, initQuery: initQuery };
})();
