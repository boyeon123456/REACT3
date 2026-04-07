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
  const subjectsByGrade = {
    1: {
      '월': ['국어', '수학', '영어', '과학', '사회', '체육', '음악'],
      '화': ['공통 사회1', '음악', '음악', '음악', '미술', '체육', '동아리'],
      '수': ['과학', '사회', '수학', '영어', '국어', '창체'],
      '목': ['영어', '국어', '수학', '과학', '체육', '도덕', '정보'],
      '금': ['국어', '수학', '영어', '사회', '음악', '미술', '체육']
    },
    2: {
      '월': ['수학', '영어', '국어', '사회', '과학', '음악', '체육'],
      '화': ['영어', '국어', '수학', '미술', '과학', '동아리', '체육'],
      '수': ['국어', '과학', '사회', '수학', '영어', '창체'],
      '목': ['과학', '수학', '영어', '국어', '정보', '도덕', '체육'],
      '금': ['영어', '사회', '국어', '수학', '체육', '음악', '미술']
    },
    3: {
      '월': ['영어', '수학', '과학', '국어', '사회', '체육', '음악'],
      '화': ['국어', '영어', '과학', '수학', '미술', '동아리', '체육'],
      '수': ['사회', '국어', '수학', '영어', '과학', '창체'],
      '목': ['수학', '과학', '영어', '국어', '도덕', '정보', '체육'],
      '금': ['과학', '영어', '수학', '국어', '음악', '미술', '체육']
    }
  };

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

  // Insert Mock User
  db.run(`INSERT OR IGNORE INTO users (email, name, password, points, level) 
          VALUES ('student@school.kr', '학생1', '1234', 1240, 4)`);
});

module.exports = db;
