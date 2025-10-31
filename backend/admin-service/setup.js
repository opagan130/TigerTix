
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '../shared-db/database.sqlite');
const initSqlPath = path.join(__dirname, '../shared-db/init.sql');

/**
 * initDb
 * ------------------------------
 * Initializes the shared SQLite database if it doesn't exist.
 * Executes SQL schema from init.sql to create required tables.
 *
 * @returns {void}
 *
 * Side Effects:
 *   - Creates `database.sqlite` if missing.
 *   - Ensures `events` table schema exists.
 *   - Logs initialization status to the console.
 */
function initDb() {
  if (!fs.existsSync(initSqlPath)) {
    console.error('init.sql not found at', initSqlPath);
    return;
  }
  const initSql = fs.readFileSync(initSqlPath, 'utf8');
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Failed to open DB', err);
      return;
    }
    db.exec(initSql, (err2) => {
      if (err2) console.error('DB init error', err2);
      else console.log('Database initialized or already exists at', dbPath);
      db.close();
    });
  });
}

module.exports = { initDb };
