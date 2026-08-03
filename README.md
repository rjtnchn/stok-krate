# WalangBrownout Appliances Inventory Management System

A web-based Inventory Management System (IMS) built for a fictional appliance retail company. The system tracks products, batch-based stock, sales, and reorder alerts for a single warehouse.

## Problem Statement

The system addresses three core inventory problems:

- **Summer Crunch** — seasonal stockouts during high-demand periods
- **Mystery Shrinkage** — mismatches between recorded and physical stock
- **Expiry Trap** — losses from expired products going unnoticed

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite) |
| Backend | Laravel (REST API) |
| Database | MySQL |
| Containerization | Docker (optional, recommended) |
| Version Control | Git / GitHub |

## Project Structure

```
walangbrownout-ims/
├── backend/            # Laravel API
├── frontend/           # React app
├── docs/               # Architecture blueprint, ERD, sprint docs
├── docker-compose.yml
└── README.md
```

## Getting Started

### Prerequisites

- PHP 8.5+
- Composer
- Node.js (LTS)
- MySQL (standalone server)
- Docker (optional)

### 1. Clone the repo

```bash
git clone https://github.com/<your-username>/walangbrownout-ims.git
cd walangbrownout-ims
```

### 2. Backend setup (Laravel)

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

### 3. Frontend setup (React)

```bash
cd frontend
npm install
npm run dev
```

### 4. Database

Create a local MySQL database and update `backend/.env`:

```
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=walangbrownout_ims
DB_USERNAME=your_username
DB_PASSWORD=your_password
```

### 5. (Optional) Run with Docker

```bash
docker compose up -d
```

## Branching Strategy

- `main` — stable, demo-ready code only
- `develop` — active integration branch
- `feature/<name>` — individual feature work, branched from `develop`

Example:

```bash
git checkout develop
git pull
git checkout -b feature/product-crud
```

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add product batch model
fix: correct FEFO sort order
docs: update ERD
chore: init repo structure
```

## Project Status

Currently in active development.