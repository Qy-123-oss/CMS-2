```md
# Library Management System

This project is a Vue 3 based front-end course project for a Library Management System. It uses static HTML pages with Vue CDN, so it can run directly in the browser without a build tool or backend server.

## Features

- User login with administrator and normal user roles
- Book list display
- Add, edit, delete, scrap, and relocate books
- Book search by title, author, or ISBN
- Borrow management, including borrowing, returning, renewal, reservation, and reservation cancellation
- Reader information management
- Statistics reports for popular books, inventory analysis, stock shortage, and purchase recommendations
- Original visual effects are preserved, including the background, sidebar, top navigation bar, and falling decoration animation

## Technical Details

The front end is implemented with Vue 3 through:
```html
<script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script>
```
Each HTML page keeps only Vue mount points, while the page layout, forms, tables, menus, and business content are rendered by Vue components. Data is stored in browser `localStorage`, so no backend service is required.

## How to Run

Open:
```text
BookManagement/login.html
```
in a browser.

The browser needs network access to load Vue from the CDN.

## Demo Accounts

Administrator:
```text
Username: admin
Password: admin123
```
Normal user:
```text
Username: user
Password: user123
```

```
