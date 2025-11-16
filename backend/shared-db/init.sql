-- init.sql
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  date TEXT NOT NULL,       -- ISO date string, e.g. 2025-10-11
  total_tickets INTEGER NOT NULL CHECK(total_tickets >= 0),
  available_tickets INTEGER NOT NULL CHECK(available_tickets >= 0),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pending_bookings (
  token      TEXT PRIMARY KEY,             
  event_name TEXT NOT NULL,                 
  tickets    INTEGER NOT NULL CHECK (tickets > 0),
  raw_text   TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);