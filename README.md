# 🚀 DBreeze

Лёгкий и быстрый кроссплатформенный SQL-клиент, построенный на **Rust + Tauri** с современным интерфейсом на **React / Svelte**.

> Минимализм, скорость и контроль — без перегруженного enterprise-функционала.

---

## ✨ Возможности

### ⚡ Производительность
- Нативный backend на Rust
- Асинхронная обработка через `tokio` и `sqlx`
- Работа с большими таблицами (100k+ строк) без лагов
- Быстрый старт приложения (< 2s)

### 🧠 SQL Editor
- Monaco Editor (движок VS Code)
- Подсветка SQL-синтаксиса
- Автодополнение таблиц и колонок
- Выполнение запросов (`Ctrl + Enter`)
- История запросов
- Сохранение SQL-сниппетов

### 📊 Table Viewer
- Виртуализированный рендер (react-virtual)
- Сортировка и фильтрация
- Пагинация / infinite scroll
- Inline-редактирование
- Авто-генерация SQL (UPDATE / INSERT / DELETE)

### 🗂 Database Explorer
- Дерево базы данных
- Lazy loading таблиц
- Поиск по таблицам
- Быстрый доступ к данным

### 🔌 Подключения к БД
- ✅ SQLite (MVP)
- ✅ PostgreSQL (MVP)
- 🔜 MySQL

### 📤 Экспорт данных
- CSV
- JSON
- Экспорт результатов запроса или таблицы

---

## 🧱 Технологический стек

### Backend
- Rust (Edition 2021)
- Tauri v2
- sqlx
- tokio

### Frontend
- React 18 / Svelte 5
- Monaco Editor
- Tailwind CSS
- Zustand / Jotai
- Vite

---

## 🏗 Архитектура

Frontend (React / Svelte)

Tauri IPC

Rust Backend

Database Layer (SQLite / PostgreSQL / MySQL)

---

## 🚀 Установка и запуск

### 1. Клонировать репозиторий
git clone https://github.com/skanie/dbreeze.git
cd dbreeze

### 2. Установить зависимости
npm install

### 3. Запуск в dev-режиме
npm run tauri dev

### 4. Сборка приложения
npm run tauri build

---

## 📁 Структура проекта

----------

---

## 🔐 Безопасность

- Пароли хранятся в OS Keyring
- Параметризованные SQL-запросы
- Локальный IPC (без сети)

---

## 🛣 Roadmap

- [x] SQLite  
- [x] SQL Editor  
- [x] Table Viewer  
- [ ] MySQL  
- [ ] ER-диаграммы  
- [ ] Plugin API  

---

## 🤝 Вклад

PR и идеи приветствуются!

---

## 📄 Лицензия

MIT
