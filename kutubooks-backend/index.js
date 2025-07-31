const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config();
const authenticateToken = require('./authenticateToken');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

// Serve static files from current directory
app.use(express.static(__dirname));

// 1. CONNECT TO DATABASE
const db = new sqlite3.Database('./kutubooks.db', (err) => {
  if (err) {
    console.error('DB connection failed:', err.message);
    return;
  }
  console.log('Connected to SQLite database');
  
  // Create tables
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS stories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'write',
      language TEXT,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      story_id INTEGER,
      UNIQUE(user_id, story_id)
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      story_id INTEGER,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  });
});

// User registration with hashed password
app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Please provide name, email and password' });
  }

  try {
    // Check if user exists
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, existingUser) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      
      if (existingUser) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user with hashed password
      db.run(
        'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
        [name, email, hashedPassword],
        function(err) {
          if (err) return res.status(500).json({ error: 'Database error' });

          // Create JWT token
          const token = jwt.sign(
            { userId: this.lastID, email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
          );

          res.status(201).json({ message: 'User registered', token, userId: this.lastID });
        }
      );
    });
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
  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) return res.status(500).json({ error: 'Server error' });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

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

    res.json({ message: 'Login successful', token, userId: user.id });
  });
});


//  4. GET ALL USERS
app.get('/users', (req, res) => {
  db.all('SELECT id, name, email FROM users', (err, results) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    res.json(results);
  });
});

//  5. UPDATE USER
app.put('/users/:id', authenticateToken, (req, res) => {
  const { name, email } = req.body;
  const sql = 'UPDATE users SET name = ?, email = ? WHERE id = ?';
  db.run(sql, [name, email, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    res.json({ message: 'User updated' });
  });
});

//  6. DELETE USER
app.delete('/users/:id', authenticateToken, (req, res) => {
  const sql = 'DELETE FROM users WHERE id = ?';
  db.run(sql, [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    res.json({ message: 'User deleted' });
  });
});

// Get all stories
app.get('/stories', (req, res) => {
  const sql = 'SELECT * FROM stories';
  db.all(sql, (err, results) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    res.json(results);
  });
});

// Get a single story by ID
app.get('/stories/:id', (req, res) => {
  const sql = 'SELECT * FROM stories WHERE id = ?';
  db.get(sql, [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    if (!result) return res.status(404).json({ error: 'Story not found' });
    res.json(result);
  });
});

// Create a new story
app.post('/stories', (req, res) => {
  const { title, content, type, language, user_id } = req.body;
  const sql = 'INSERT INTO stories (title, content, type, language, user_id) VALUES (?, ?, ?, ?, ?)';
  db.run(sql, [title, content, type || 'write', language, user_id], function(err) {
    if (err) return res.status(500).json({ error: 'Server error' });
    res.status(201).json({ message: 'Story created', storyId: this.lastID });
  });
});

// Update a story by ID
app.put('/stories/:id', authenticateToken, (req, res) => {
  const { title, content, type, language } = req.body;
  const userId = req.user.userId;
  
  // First check if story belongs to user
  db.get('SELECT user_id FROM stories WHERE id = ?', [req.params.id], (err, story) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    if (!story) return res.status(404).json({ error: 'Story not found' });
    if (story.user_id !== userId) return res.status(403).json({ error: 'You can only edit your own stories' });
    
    // Update story if user owns it
    const sql = 'UPDATE stories SET title = ?, content = ?, type = ?, language = ? WHERE id = ?';
    db.run(sql, [title, content, type, language, req.params.id], (err) => {
      if (err) return res.status(500).json({ error: 'Server error' });
      res.json({ message: 'Story updated' });
    });
  });
});

// Delete a story by ID
app.delete('/stories/:id', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  
  // First check if story belongs to user
  db.get('SELECT user_id FROM stories WHERE id = ?', [req.params.id], (err, story) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    if (!story) return res.status(404).json({ error: 'Story not found' });
    if (story.user_id !== userId) return res.status(403).json({ error: 'You can only delete your own stories' });
    
    // Delete story if user owns it
    const sql = 'DELETE FROM stories WHERE id = ?';
    db.run(sql, [req.params.id], (err) => {
      if (err) return res.status(500).json({ error: 'Server error' });
      res.json({ message: 'Story deleted' });
    });
  });
});

// 1. Add a Like (POST /likes)
app.post('/likes', (req, res) => {
  const { user_id, story_id } = req.body;
  const sql = 'INSERT INTO likes (user_id, story_id) VALUES (?, ?)';
  db.run(sql, [user_id, story_id], (err) => {
    if (err) {
      if (err.code === 'SQLITE_CONSTRAINT') {
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
  db.run(sql, [user_id, story_id], function(err) {
    if (err) return res.status(500).json({ error: 'Server error' });
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Like not found' });
    }
    res.json({ message: 'Like removed' });
  });
});

// 3. Get number of likes for a story (GET /stories/:id/likes)
app.get('/stories/:id/likes', (req, res) => {
  const storyId = req.params.id;
  const sql = 'SELECT COUNT(*) AS likes_count FROM likes WHERE story_id = ?';
  db.get(sql, [storyId], (err, result) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    res.json({ story_id: storyId, likes_count: result.likes_count });
  });
});

// 4. (Optional) Check if user liked a story (GET /likes/check?user_id=...&story_id=...)
app.get('/likes/check', (req, res) => {
  const { user_id, story_id } = req.query;
  const sql = 'SELECT * FROM likes WHERE user_id = ? AND story_id = ?';
  db.get(sql, [user_id, story_id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    res.json({ liked: !!result });
  });
});

// Create a new comment
app.post('/comments', (req, res) => {
  const { user_id, story_id, content } = req.body;
  if (!user_id || !story_id || !content) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const sql = 'INSERT INTO comments (user_id, story_id, content) VALUES (?, ?, ?)';
  db.run(sql, [user_id, story_id, content], function(err) {
    if (err) {
      console.error('Error inserting comment:', err);
      return res.status(500).json({ error: 'Server error' });
    }
    res.status(201).json({ message: 'Comment created', commentId: this.lastID });
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
  db.all(sql, [storyId], (err, results) => {
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
  db.run(sql, [content, id], function(err) {
    if (err) {
      console.error('Error updating comment:', err);
      return res.status(500).json({ error: 'Server error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    res.json({ message: 'Comment updated' });
  });
});

// Delete a comment by id
app.delete('/comments/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM comments WHERE id = ?';
  db.run(sql, [id], function(err) {
    if (err) {
      console.error('Error deleting comment:', err);
      return res.status(500).json({ error: 'Server error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    res.json({ message: 'Comment deleted' });
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('healthy');
});

// Serve main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

//  7. START SERVER
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
  console.log(`Frontend available at http://0.0.0.0:${port}`);
});


