# WalangBrownout Appliances Inventory Management System

A web-based **Inventory Management System (IMS)** designed for a fictional appliance retail company. This system helps manage product inventory, batch-based stock, sales transactions, and automated reorder alerts within a single warehouse environment.

---

## 🚀 Tech Stack

![React](https://img.shields.io/badge/Frontend-React-61DAFB?logo=react\&logoColor=white)
![Laravel](https://img.shields.io/badge/Backend-Laravel-FF2D20?logo=laravel\&logoColor=white)
![MySQL](https://img.shields.io/badge/Database-MySQL-4479A1?logo=mysql\&logoColor=white)
![Docker](https://img.shields.io/badge/DevOps-Docker-2496ED?logo=docker\&logoColor=white)
![GitHub](https://img.shields.io/badge/Version%20Control-GitHub-181717?logo=github)

---

## 📖 Project Overview

The system is built to address common inventory challenges in appliance retail operations, focusing on accuracy, efficiency, and visibility of stock movement.

---

## ⚠️ Problem Statement

The system addresses three core inventory problems:

* **Summer Crunch** — seasonal stockouts during high-demand periods
* **Mystery Shrinkage** — mismatches between recorded and physical stock
* **Expiry Trap** — losses from expired or overlooked products

---

## 📁 Project Structure

```
walangbrownout-ims/
├── backend/            # Laravel API
├── frontend/           # React application
├── docs/               # Architecture, ERD, and documentation
├── docker-compose.yml
└── README.md
```

---

## ⚙️ Getting Started

### Prerequisites

* PHP 8.5+
* Composer
* Node.js (LTS)
* MySQL
* Docker (optional)

---

### 1. Clone the Repository

```bash
git clone https://github.com/<your-username>/walangbrownout-ims.git
cd walangbrownout-ims
```

---

### 2. Backend Setup (Laravel)

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

---

### 3. Frontend Setup (React)

```bash
cd frontend
npm install
npm run dev
```

---

### 4. Database Configuration

Update `backend/.env` with your local MySQL credentials:

```
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=walangbrownout_ims
DB_USERNAME=your_username
DB_PASSWORD=your_password
```

---

### 5. (Optional) Run with Docker

```bash
docker compose up -d
```

---

## 🌿 Branching Strategy

* `main` — stable, demo-ready code
* `develop` — integration branch
* `feature/<name>` — feature development

Example:

```bash
git checkout develop
git pull
git checkout -b feature/product-crud
```

---

## 📝 Commit Convention

We follow **Conventional Commits**:

```
feat: add product batch model
fix: correct FEFO sorting logic
docs: update ERD
chore: initialize project structure
```

---

## 📌 Project Status

🚧 Currently in active development (prototype phase)

This project focuses on delivering a **functional system**, prioritizing completion and usability over complexity.

---
