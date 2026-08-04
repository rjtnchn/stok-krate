# Backend — Laravel API

## Prerequisites

| Requirement | Verify with |
|---|---|
| PHP 8.5+ | `php -v` |
| Composer | `composer -v` |
| MySQL Server (standalone install) | `mysql --version` |

If any command is not recognized, that tool either isn't installed or isn't added to your system PATH.

## Setup

### Step 1: Set up MySQL

**1.1 Log in to MySQL as root**
```bash
mysql -u root -p
```
Enter the root password you set when you installed MySQL.

**1.2 Create the project database**
```sql
CREATE DATABASE wb_ims;
```

**1.3 Create a dedicated app user** (do not use root in the app itself)
```sql
CREATE USER 'ims_user'@'localhost' IDENTIFIED BY 'strong_password';
GRANT ALL PRIVILEGES ON wb_ims.* TO 'ims_user'@'localhost';
FLUSH PRIVILEGES;
```
Replace `strong_password` with your own password — remember it, you'll need it in Step 2.

**1.4 Confirm it was created**
```sql
SHOW DATABASES;
```
You should see `wb_ims` in the list. Then exit:
```sql
EXIT;
```

### Step 2: Configure the environment

**2.1 Move into the backend folder**
```bash
cd backend
```

**2.2 Create your local environment file**
```bash
cp .env.example .env
```

**2.3 Edit `.env`** and update the database section to match Step 1:
```
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=wb_ims
DB_USERNAME=ims_user
DB_PASSWORD=strong_password
```
`.env` is your personal local file — it's gitignored and never pushed to GitHub. Each teammate has their own copy with their own password.

### Step 3: Install and run

**3.1 Install PHP dependencies**
```bash
composer install
```

**3.2 Generate the app encryption key**
```bash
php artisan key:generate
```

**3.3 Run migrations** (creates the database tables)
```bash
php artisan migrate
```
If this prompts about SQLite instead of connecting to MySQL, your `.env` still has `DB_CONNECTION=sqlite` — go back to Step 2.3 and fix it, then run `php artisan config:clear` before trying again.

**3.4 Start the server**
```bash
php artisan serve
```
You should see:
```
INFO  Server running on [http://127.0.0.1:8000].
```
Open that URL in your browser to confirm you see Laravel's welcome page.

## Common Issues

| Problem | Fix |
|---|---|
| SQLite prompt when running `migrate` | `DB_CONNECTION` in `.env` is not set to `mysql`. Fix it, then run `php artisan config:clear`. |
| `mysql` not recognized in terminal | MySQL's `bin` folder isn't in your system PATH. |
| Access denied for user | Double-check `DB_USERNAME` / `DB_PASSWORD` in `.env` match what you created in Step 1.3. |
