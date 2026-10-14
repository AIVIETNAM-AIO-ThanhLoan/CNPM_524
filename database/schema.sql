-- MySQL 8+ / MariaDB 10.4+. Applied once; never resets existing data.
CREATE TABLE users (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    account VARCHAR(190) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
    blocked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sessions (
    token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX (expires_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE accounts (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    name VARCHAR(100) NOT NULL,
    kind ENUM('wallet', 'income', 'expense', 'equity') NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'VND',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY (user_id, id),
    UNIQUE KEY (user_id, name),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CHECK (currency = 'VND')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE categories (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    account_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    name VARCHAR(100) NOT NULL,
    kind ENUM('income', 'expense') NOT NULL,
    UNIQUE KEY (user_id, id),
    UNIQUE KEY (user_id, kind, name),
    UNIQUE KEY (account_id),
    FOREIGN KEY (user_id, account_id) REFERENCES accounts(user_id, id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE transactions (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    kind ENUM('income', 'expense', 'transfer') NOT NULL,
    amount DECIMAL(14,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'VND',
    booked_on DATE NOT NULL,
    note VARCHAR(500) NOT NULL DEFAULT '',
    category_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
    request_key CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY (user_id, id),
    UNIQUE KEY (user_id, request_key),
    INDEX (user_id, booked_on),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id, category_id) REFERENCES categories(user_id, id),
    CHECK (amount > 0),
    CHECK (currency = 'VND'),
    CHECK ((kind = 'transfer' AND category_id IS NULL) OR (kind <> 'transfer' AND category_id IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE transaction_entries (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    transaction_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    account_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    amount DECIMAL(14,2) NOT NULL,
    UNIQUE KEY (transaction_id, account_id),
    INDEX (user_id, account_id),
    FOREIGN KEY (user_id, transaction_id) REFERENCES transactions(user_id, id) ON DELETE CASCADE,
    FOREIGN KEY (user_id, account_id) REFERENCES accounts(user_id, id),
    CHECK (amount <> 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE budgets (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    category_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    month_start DATE NOT NULL,
    amount DECIMAL(14,2) NOT NULL,
    UNIQUE KEY (user_id, category_id, month_start),
    FOREIGN KEY (user_id, category_id) REFERENCES categories(user_id, id),
    CHECK (amount > 0),
    CHECK (DAYOFMONTH(month_start) = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE goals (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    name VARCHAR(100) NOT NULL,
    target_amount DECIMAL(14,2) NOT NULL,
    due_on DATE NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CHECK (target_amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE recurring_transactions (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    account_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    category_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    amount DECIMAL(14,2) NOT NULL,
    next_due_on DATE NOT NULL,
    frequency ENUM('weekly', 'monthly', 'yearly') NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY (user_id, account_id) REFERENCES accounts(user_id, id),
    FOREIGN KEY (user_id, category_id) REFERENCES categories(user_id, id),
    CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reserved for later multicurrency support. Posting currently uses VND only.
CREATE TABLE exchange_rates (
    base_currency CHAR(3) NOT NULL,
    quote_currency CHAR(3) NOT NULL,
    rate_date DATE NOT NULL,
    rate DECIMAL(20,8) NOT NULL,
    PRIMARY KEY (base_currency, quote_currency, rate_date),
    CHECK (rate > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
