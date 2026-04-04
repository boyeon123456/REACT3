const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'schoolcom.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Users Table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    name TEXT,
    password TEXT,
    points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    role TEXT DEFAULT 'user'
  )`);
  
  // Posts Table
  db.run(`CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    content TEXT,
    board TEXT,
    author TEXT,
    author_id INTEGER,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  // Comments Table
  db.run(`CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER,
    content TEXT,
    author TEXT,
    author_id INTEGER,
    likes INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Insert Mock User
  db.run(`INSERT OR IGNORE INTO users (email, name, password, points, level) 
          VALUES ('student@school.kr', '학생1', '1234', 1240, 4)`);
});

module.exports = db;
