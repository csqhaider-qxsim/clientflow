const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool, neonConfig } = require('@neondatabase/serverless');
const ws = require('ws');
neonConfig.webSocketConstructor = ws;
require('dotenv').config();

const app = express();

// SECURITY: Only allow requests from your specific frontend URL
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET;

// Connect to Neon PostgreSQL (Bulletproof SSL Configuration)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Auto-Create Tables & Seed Admin
const initializeDatabase = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user'
      );
      
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        status VARCHAR(50) DEFAULT 'Active'
      );
      
      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        amount DOUBLE PRECISION NOT NULL,
        status VARCHAR(50) DEFAULT 'Unpaid'
      );
    `);

    // Seed Admin if it doesn't exist
    const adminCheck = await pool.query('SELECT * FROM users WHERE email = $1', ['admin@clientflow.com']);
    if (adminCheck.rows.length === 0) {
      const adminPassword = await bcrypt.hash('AdminPass123!', 10);
      await pool.query(
        'INSERT INTO users (email, password, role) VALUES ($1, $2, $3)',
        ['admin@clientflow.com', adminPassword, 'admin']
      );
      console.log('Admin account created: admin@clientflow.com');
    }
    console.log('Database connected and tables verified.');
  } catch (err) {
    console.error('Database initialization failed:', err);
  }
};
initializeDatabase();

// Middleware: Authenticate JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
  next();
};

// --- AUTH ROUTES ---

app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

  try {
    const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id, email, role',
      [email, hashedPassword, 'user']
    );
    
    const newUser = result.rows[0];
    const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role }, JWT_SECRET, { expiresIn: '1d' });
    res.status(201).json({ token, user: newUser });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(400).json({ message: 'Invalid credentials' });

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// --- ADMIN ROUTES ---

app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  const result = await pool.query('SELECT id, email, role FROM users');
  res.json(result.rows);
});

app.patch('/api/admin/users/:id/password', authenticateToken, requireAdmin, async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ message: 'Password too short' });

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, req.params.id]);
  res.json({ message: 'Password updated successfully.' });
});

app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  if (Number(req.params.id) === req.user.id) return res.status(400).json({ message: 'Cannot delete own account' });
  await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
  res.json({ message: 'User account removed' });
});

// --- DASHBOARD ROUTES ---

app.get('/api/clients', authenticateToken, async (req, res) => {
  const result = await pool.query('SELECT id, name, email, status FROM clients WHERE user_id = $1', [req.user.id]);
  res.json(result.rows);
});

app.post('/api/clients', authenticateToken, async (req, res) => {
  const { name, email, status } = req.body;
  const result = await pool.query(
    'INSERT INTO clients (user_id, name, email, status) VALUES ($1, $2, $3, $4) RETURNING *',
    [req.user.id, name, email, status]
  );
  res.status(201).json(result.rows[0]);
});

app.get('/api/invoices', authenticateToken, async (req, res) => {
  const result = await pool.query(
    'SELECT id, client_id AS "clientId", title, amount, status FROM invoices WHERE user_id = $1',
    [req.user.id]
  );
  res.json(result.rows);
});

app.post('/api/invoices', authenticateToken, async (req, res) => {
  const { title, amount, clientId } = req.body;
  const result = await pool.query(
    'INSERT INTO invoices (user_id, client_id, title, amount, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, client_id AS "clientId", title, amount, status',
    [req.user.id, clientId, title, amount, 'Unpaid']
  );
  res.status(201).json(result.rows[0]);
});

app.patch('/api/invoices/:id', authenticateToken, async (req, res) => {
  const result = await pool.query(
    'UPDATE invoices SET status = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
    [req.body.status, req.params.id, req.user.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ message: 'Invoice not found' });
  res.json(result.rows[0]);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});