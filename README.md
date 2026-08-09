

Root readme · MD
# WalangBrownout Appliances Inventory Management System
 
A web-based **Inventory Management System (IMS)** designed for a fictional appliance retail company. This system helps manage product inventory, batch-based stock, sales transactions, and automated reorder alerts within a single warehouse environment.
 
---
 
## 🚀 Tech Stack
 
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Laravel](https://img.shields.io/badge/Laravel-FF2D20?style=for-the-badge&logo=laravel&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-00546B?style=for-the-badge&logo=mysql&logoColor=white)
 
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
stok-krate/
├── backend/            # Laravel API — see backend/README.md
├── frontend/           # React app — see frontend/README.md
└── README.md
```
 
## ⚙️ Getting Started
 
---
 
### Clone the Repository
 
```bash
git clone https://github.com/rjtnchn/stok-krate.git
cd stok-krate
```
 
---
 
## Project Structure
 
```
stok-krate/
├── backend/            # Laravel API — see backend/README.md
├── frontend/           # React app — see frontend/README.md
└── README.md
```
 
## Setup
 
This repo has two parts, each with its own setup guide:
 
- **Backend (Laravel + MySQL):** see [`backend/README.md`](./backend/README.md)
- **Frontend (React):** see [`frontend/README.md`](./frontend/README.md)
Set up the backend first — the frontend depends on the API running locally.
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
 
