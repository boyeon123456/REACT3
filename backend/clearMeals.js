const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'schoolcom.db');
const db = new sqlite3.Database(dbPath);

console.log('기존 급식 데이터를 삭제합니다...');
db.run("DELETE FROM meals", (err) => {
  if (err) {
    console.error('오류 발생:', err.message);
  } else {
    console.log('삭제 완료! 이제 서버를 재시작하거나 database.js를 실행하면 옥종고등학교 데이터를 가져옵니다.');
  }
  db.close();
});
