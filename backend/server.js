const express = require('express');
const cors = require('cors');
const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

// --- Authentication ---
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  db.get(`SELECT * FROM users WHERE email = ? AND password = ?`, [email, password], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) res.json({ success: true, user: row });
    else res.status(401).json({ success: false, message: 'Invalid credentials' });
  });
});

app.post('/api/register', (req, res) => {
  const { email, name, password } = req.body;
  db.run(`INSERT INTO users (email, name, password) VALUES (?, ?, ?)`, 
    [email, name, password], function(err) {
      if (err) return res.status(400).json({ error: 'Email already exists' });
      res.json({ success: true, userId: this.lastID });
  });
});

// --- Posts ---
app.get('/api/posts', (req, res) => {
  db.all(`SELECT * FROM posts ORDER BY id DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/posts/trending', (req, res) => {
  db.all(`SELECT * FROM posts WHERE likes > 0 ORDER BY likes DESC, views DESC LIMIT 5`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/posts/:id', (req, res) => {
  const id = req.params.id;
  // Increase views
  db.run(`UPDATE posts SET views = views + 1 WHERE id = ?`, [id], () => {
    db.get(`SELECT * FROM posts WHERE id = ?`, [id], (err, post) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!post) return res.status(404).json({ error: 'Not found' });
      
      db.all(`SELECT * FROM comments WHERE post_id = ? ORDER BY id ASC`, [id], (err, comments) => {
        post.commentsList = comments || [];
        res.json(post);
      });
    });
  });
});

app.post('/api/posts', (req, res) => {
  const { title, content, board, author, author_id } = req.body;
  db.run(`INSERT INTO posts (title, content, board, author, author_id) VALUES (?, ?, ?, ?, ?)`, 
    [title, content, board, author, author_id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, postId: this.lastID });
  });
});

app.post('/api/posts/:id/like', (req, res) => {
  db.run(`UPDATE posts SET likes = likes + 1 WHERE id = ?`, [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// --- Comments ---
app.post('/api/comments', (req, res) => {
  const { post_id, content, author, author_id } = req.body;
  db.run(`INSERT INTO comments (post_id, content, author, author_id) VALUES (?, ?, ?, ?)`, 
    [post_id, content, author, author_id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      db.run(`UPDATE posts SET comments = comments + 1 WHERE id = ?`, [post_id]);
      res.json({ success: true, commentId: this.lastID });
  });
});

// --- Users (Rankings / Points) ---
app.get('/api/users/ranking', (req, res) => {
  db.all(`SELECT id, name, points, level FROM users ORDER BY points DESC LIMIT 5`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/users/:id', (req, res) => {
  db.get(`SELECT id, email, name, points, level, role FROM users WHERE id = ?`, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row);
  });
});

app.post('/api/users/:id/points', (req, res) => {
  const { amount } = req.body;
  db.run(`UPDATE users SET points = points + ? WHERE id = ?`, [amount, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    db.get(`SELECT points, level FROM users WHERE id = ?`, [req.params.id], (err, row) => {
      let newLevel = row.level;
      if (row.points > 1500) newLevel = 5;
      else if (row.points > 800) newLevel = 4;
      else if (row.points > 400) newLevel = 3;
      else if (row.points > 100) newLevel = 2;
      
      if (newLevel !== row.level) {
        db.run(`UPDATE users SET level = ? WHERE id = ?`, [newLevel, req.params.id]);
      }
      res.json({ success: true, points: row.points, level: newLevel });
    });
  });
});

// --- Timetable ---
app.get('/api/timetable', (req, res) => {
  const { grade = 1, class: cls = 1 } = req.query;
  db.all(`SELECT * FROM timetable WHERE grade = ? AND class = ? ORDER BY day, period`, 
    [grade, cls], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      
      // Group by day for convenience
      const timetable = { '월': [], '화': [], '수': [], '목': [], '금': [] };
      rows.forEach(row => {
        if (timetable[row.day]) {
          timetable[row.day].push(row);
        }
      });
      
      res.json(timetable);
  });
});

// --- Meals ---
const neisApi = require('./neisApi');
let mealCache = { data: null, fetchDate: null };
let monthlyMealCache = {}; // { '2026-4': { data: {...}, fetchDate: '...' } }

app.get('/api/meals', async (req, res) => {
  try {
    const todayStr = new Date().toDateString();
    
    // If cache is empty or stale (from a previous day), update it
    if (!mealCache.data || mealCache.fetchDate !== todayStr) {
      const liveData = await neisApi.getWeeklyMeals();
      if (Object.keys(liveData).length > 0) {
        mealCache.data = liveData;
        mealCache.fetchDate = todayStr;
      } else {
        // Fallback to mock data if API fails
        const mockData = require('./mockData.json');
        mealCache.data = mockData.mealsByDay;
        mealCache.fetchDate = todayStr;
      }
    }
    
    res.json(mealCache.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/meals/month', async (req, res) => {
  try {
    const { year, month } = req.query;
    if (!year || !month) {
      return res.status(400).json({ error: 'year and month are required' });
    }

    const cacheKey = `${year}-${month}`;
    const todayStr = new Date().toDateString();

    if (!monthlyMealCache[cacheKey] || monthlyMealCache[cacheKey].fetchDate !== todayStr) {
      const liveData = await neisApi.getMonthlyMeals(year, month);
      
      monthlyMealCache[cacheKey] = {
        data: liveData,
        fetchDate: todayStr
      };
      
      // If API brings absolutely no data, we could inject some mock data for demonstration
      // but realistically month view shouldn't just show 'Mon-Fri' repeated. Let's return what we have.
    }

    res.json(monthlyMealCache[cacheKey].data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
