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

  // Timetable Table
  db.run(`CREATE TABLE IF NOT EXISTS timetable (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grade INTEGER,
    class INTEGER,
    day TEXT,
    period INTEGER,
    subject TEXT,
    room TEXT
  )`);

  // Insert Mock Timetable Data (Grades 1-3, Class 1)
  const days = ['월', '화', '수', '목', '금'];
  const mockData = require('./mockData.json');
  const subjectsByGrade = mockData.subjectsByGrade;


  db.get(`SELECT COUNT(*) as count FROM timetable`, (err, row) => {
    if (row && row.count <= 35) { // If only 1st grade was added or empty
      db.run(`DELETE FROM timetable`); // Clear existing to prevent duplicates
      [1, 2, 3].forEach(grade => {
        days.forEach(day => {
          subjectsByGrade[grade][day].forEach((subject, index) => {
            db.run(`INSERT INTO timetable (grade, class, day, period, subject, room) 
                    VALUES (?, 1, ?, ?, ?, ?)`, [grade, day, index + 1, subject, `${grade}-1교실`]);
          });
        });
      });
    }
  });

  // Meals are now handled dynamically in server.js rather than being stored statically in the database.


  // Insert Mock User
  db.run(`INSERT OR IGNORE INTO users (email, name, password, points, level) 
          VALUES ('student@school.kr', '학생1', '1234', 1240, 4)`);
});

module.exports = db;
