const sqlite3 = require('sqlite3').verbose();
const path = require('path');


const dbPath = path.resolve(__dirname, 'schoolcom.db');
const db = new sqlite3.Database(dbPath);

// Legacy local SQLite schema used by old REST endpoints in server.js.
// The current app stores user, post, point, shop, and arcade data in Firestore.
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
      [days[0]]: ['국어', '수학', '영어', '통합사회', '과학', '체육', '자율'],
      [days[1]]: ['영어', '국어', '수학', '한국사', '음악', '과학', '동아리'],
      [days[2]]: ['수학', '영어', '통합사회', '국어', '미술', '진로', '체육'],
      [days[3]]: ['과학', '수학', '영어', '국어', '한국사', '정보', '자율'],
      [days[4]]: ['국어', '영어', '수학', '통합사회', '과학', '체육', '창체'],
    },
    2: {
      [days[0]]: ['문학', '수학 I', '영어 I', '세계사', '생명과학', '체육', '자율'],
      [days[1]]: ['영어 I', '문학', '수학 I', '정치와 법', '음악', '화학', '동아리'],
      [days[2]]: ['수학 I', '영어 I', '세계사', '문학', '미술', '진로', '체육'],
      [days[3]]: ['생명과학', '수학 I', '영어 I', '문학', '정치와 법', '정보', '자율'],
      [days[4]]: ['문학', '영어 I', '수학 I', '세계사', '화학', '체육', '창체'],
    },
    3: {
      [days[0]]: ['독서', '미적분', '영어 독해', '사회문화', '물리학', '체육', '자율'],
      [days[1]]: ['영어 독해', '독서', '미적분', '생활과 윤리', '음악', '지구과학', '동아리'],
      [days[2]]: ['미적분', '영어 독해', '사회문화', '독서', '미술', '진로', '체육'],
      [days[3]]: ['물리학', '미적분', '영어 독해', '독서', '생활과 윤리', '정보', '자율'],
      [days[4]]: ['독서', '영어 독해', '미적분', '사회문화', '지구과학', '체육', '창체'],
    },
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

  // Meals are now handled dynamically in server.js rather than being stored statically in the database.


  // Insert Mock User
  db.run(`INSERT OR IGNORE INTO users (email, name, password, points, level) 
          VALUES ('student@school.kr', '학생1', '1234', 1240, 4)`);
});

module.exports = db;
