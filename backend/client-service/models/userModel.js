const db = require('./db');
const bcrypt = require('bcryptjs');

function createUser(email, password, cb) {
  const hashed = bcrypt.hashSync(password, 10);
  const sql = `INSERT INTO users (email, password) VALUES (?, ?)`;
  db.run(sql, [email, hashed], cb);
}

function findUserByEmail(email, cb) {
  db.get(`SELECT * FROM users WHERE email = ?`, [email], cb);
}

module.exports = { createUser, findUserByEmail };
