const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const authenticateToken = require('./authenticateToken');

const app = express();
const port = 3000;

app.use(bodyParser.json());

// 1. CONNECT TO DATABASE
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'kutupass', // or your MySQL password
  database: 'kutubooks'
});

db.connect((err) => {
  if (err) {
    console.error('DB connection failed:', err.stack);
    return;
  }
  console.log('Connected to MySQL database ');
});

// User registration with hashed password
app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Please provide name, email and password' });
  }

  try {
    // Check if user exists
    const [existingUser] = await new Promise((resolve, reject) => {
      db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user with hashed password
    db.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword],
      (err, result) => {
        if (err) return res.status(500).json({ error: 'Database error' });

        // Create JWT token
        const token = jwt.sign(
          { userId: result.insertId, email },
          process.env.JWT_SECRET,
          { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.status(201).json({ message: 'User registered', token });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide email and password' });
  }

  // Find user by email
  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) return res.status(500).json({ error: 'Server error' });

    if (results.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = results[0];

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({ message: 'Login successful', token });
  });
});


//  4. GET ALL USERS
app.get('/users', (req, res) => {
  db.query('SELECT id, name, email FROM users', (err, results) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    res.json(results);
  });
});

//  5. UPDATE USER
app.put('/users/:id', authenticateToken, (req, res) => {
  const { name, email } = req.body;
  const sql = 'UPDATE users SET name = ?, email = ? WHERE id = ?';
  db.query(sql, [name, email, req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    res.json({ message: 'User updated' });
  });
});

//  6. DELETE USER
app.delete('/users/:id', authenticateToken, (req, res) => {
  const sql = 'DELETE FROM users WHERE id = ?';
  db.query(sql, [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    res.json({ message: 'User deleted' });
  });
});

// Get all stories
app.get('/stories', (req, res) => {
  const sql = 'SELECT * FROM stories';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    res.json(results);
  });
});

// Get a single story by ID
app.get('/stories/:id', (req, res) => {
  const sql = 'SELECT * FROM stories WHERE id = ?';
  db.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    if (results.length === 0) return res.status(404).json({ error: 'Story not found' });
    res.json(results[0]);
  });
});

// Create a new story
app.post('/stories', authenticateToken, (req, res) => {
  const { title, content, type, language, user_id } = req.body;
  const sql = 'INSERT INTO stories (title, content, type, language, user_id) VALUES (?, ?, ?, ?, ?)';
  db.query(sql, [title, content, type || 'write', language, user_id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    res.status(201).json({ message: 'Story created', storyId: result.insertId });
  });
});

// Update a story by ID
app.put('/stories/:id', authenticateToken, (req, res) => {
  const { title, content, type, language } = req.body;
  const sql = 'UPDATE stories SET title = ?, content = ?, type = ?, language = ? WHERE id = ?';
  db.query(sql, [title, content, type, language, req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    res.json({ message: 'Story updated' });
  });
});

// Delete a story by ID
app.delete('/stories/:id', authenticateToken, (req, res) => {
  const sql = 'DELETE FROM stories WHERE id = ?';
  db.query(sql, [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    res.json({ message: 'Story deleted' });
  });
});

// 1. Add a Like (POST /likes)
app.post('/likes', (req, res) => {
  const { user_id, story_id } = req.body;
  const sql = 'INSERT INTO likes (user_id, story_id) VALUES (?, ?)';
  db.query(sql, [user_id, story_id], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: 'User already liked this story' });
      }
      return res.status(500).json({ error: 'Server error' });
    }
    res.status(201).json({ message: 'Like added' });
  });
});

// 2. Remove a Like (DELETE /likes)
app.delete('/likes', (req, res) => {
  const { user_id, story_id } = req.body;
  const sql = 'DELETE FROM likes WHERE user_id = ? AND story_id = ?';
  db.query(sql, [user_id, story_id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Like not found' });
    }
    res.json({ message: 'Like removed' });
  });
});

// 3. Get number of likes for a story (GET /stories/:id/likes)
app.get('/stories/:id/likes', (req, res) => {
  const storyId = req.params.id;
  const sql = 'SELECT COUNT(*) AS likes_count FROM likes WHERE story_id = ?';
  db.query(sql, [storyId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    res.json({ story_id: storyId, likes_count: results[0].likes_count });
  });
});

// 4. (Optional) Check if user liked a story (GET /likes/check?user_id=...&story_id=...)
app.get('/likes/check', (req, res) => {
  const { user_id, story_id } = req.query;
  const sql = 'SELECT * FROM likes WHERE user_id = ? AND story_id = ?';
  db.query(sql, [user_id, story_id], (err, results) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    res.json({ liked: results.length > 0 });
  });
});

// Create a new comment
app.post('/comments', (req, res) => {
  const { user_id, story_id, content } = req.body;
  if (!user_id || !story_id || !content) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const sql = 'INSERT INTO comments (user_id, story_id, content) VALUES (?, ?, ?)';
  db.query(sql, [user_id, story_id, content], (err, result) => {
    if (err) {
      console.error('Error inserting comment:', err);
      return res.status(500).json({ error: 'Server error' });
    }
    res.status(201).json({ message: 'Comment created', commentId: result.insertId });
  });
});

// Read all comments for a specific story
app.get('/stories/:storyId/comments', (req, res) => {
  const { storyId } = req.params;
  const sql = `
    SELECT comments.id, comments.content, comments.created_at, users.name AS username
    FROM comments
    JOIN users ON comments.user_id = users.id
    WHERE comments.story_id = ?
    ORDER BY comments.created_at DESC
  `;
  db.query(sql, [storyId], (err, results) => {
    if (err) {
      console.error('Error fetching comments:', err);
      return res.status(500).json({ error: 'Server error' });
    }
    res.json(results);
  });
});

// Update a comment by id
app.put('/comments/:id', (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }
  const sql = 'UPDATE comments SET content = ? WHERE id = ?';
  db.query(sql, [content, id], (err, result) => {
    if (err) {
      console.error('Error updating comment:', err);
      return res.status(500).json({ error: 'Server error' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    res.json({ message: 'Comment updated' });
  });
});

// Delete a comment by id
app.delete('/comments/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM comments WHERE id = ?';
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('Error deleting comment:', err);
      return res.status(500).json({ error: 'Server error' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    res.json({ message: 'Comment deleted' });
  });
});

//  7. START SERVER
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});


