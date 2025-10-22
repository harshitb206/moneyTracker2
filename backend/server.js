// server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db'); // your SQLite or DB connection
const axios = require('axios');

const app = express();
const PORT = 5000;
const ML_URL = 'http://localhost:6000';

app.use(cors({
  origin: true, // reflect request origin
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(bodyParser.json());

// ------------------- EXPENSES -------------------

// Get all expenses
app.get('/expenses', (req, res) => {
  db.all('SELECT * FROM expenses ORDER BY date DESC', [], (err, rows) => {
    if (err) return res.status(400).json({ error: err.message });
    res.json(rows);
  });
});

// Add expense with ML auto-categorization + keyword fallback
app.post('/expenses', async (req, res) => {
  try {
    let { amount, merchant, category, date, notes } = req.body;
    const text = `${merchant} ${notes}`.toLowerCase();

    // Keyword map fallback
    const keywordMap = [
      { keywords: ['pizza', 'burger', 'kfc', 'dominos', 'starbucks'], label: 'Food' },
      { keywords: ['uber', 'ola', 'bus', 'train', 'cab'], label: 'Travel' },
      { keywords: ['salary', 'bonus', 'freelance'], label: 'Income' },
      { keywords: ['rent', 'apartment', 'house'], label: 'Rent' },
      { keywords: ['movie', 'netflix', 'concert'], label: 'Entertainment' },
    ];

    let predictedCategory = null;

    // Check keyword map first
    for (let entry of keywordMap) {
      if (entry.keywords.some(k => text.includes(k))) {
        predictedCategory = entry.label;
        break;
      }
    }

    // If no keyword match and category is missing, call ML
    if ((!category || category.trim() === "") && !predictedCategory) {
      try {
        const resp = await axios.post(`${ML_URL}/categorize`, { text });
        predictedCategory = resp.data.category || 'Other';
      } catch (mlErr) {
        console.error("ML service error:", mlErr.message);
        predictedCategory = 'Other';
      }
    }

    // Final category: user input > predicted > fallback
    category = category && category.trim() !== "" ? category : predictedCategory || 'Other';

    // Insert into DB
    db.run(
      'INSERT INTO expenses (amount, merchant, category, date, notes) VALUES (?,?,?,?,?)',
      [amount, merchant, category, date, notes],
      function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ id: this.lastID, category });
      }
    );

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Delete single expense
app.delete('/expenses/:id', (req, res) => {
  db.run('DELETE FROM expenses WHERE id=?', [req.params.id], function(err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// Delete all expenses
app.delete('/expenses', (req, res) => {
  db.run('DELETE FROM expenses', [], function(err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// ------------------- INCOME -------------------

// Get all income
app.get('/income', (req, res) => {
  db.all('SELECT * FROM income ORDER BY date DESC', [], (err, rows) => {
    if (err) return res.status(400).json({ error: err.message });
    res.json(rows);
  });
});

// Add income
app.post('/income', (req, res) => {
  const { amount, date } = req.body;
  db.run('INSERT INTO income (amount, date) VALUES (?, ?)', [amount, date], function(err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

// Delete single income
app.delete('/income/:id', (req, res) => {
  db.run('DELETE FROM income WHERE id=?', [req.params.id], function(err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// Delete all income
app.delete('/income', (req, res) => {
  db.run('DELETE FROM income', [], function(err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});
// ------------------- PLANNER -------------------
app.post('/planner', (req, res) => {
  try {
    const { totalIncome, totalExpense, targetSavings, days } = req.body;

    if (!totalIncome || !days) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Available money = Income - Expenses
    const available = totalIncome - totalExpense;

    // Remaining after setting aside savings
    const remainingSavings = available - targetSavings;

    // Daily allowance
    const dailyBudget = remainingSavings / days;

    // Overspend alert (if user already spent more than available - targetSavings)
    const overspendAlert = totalExpense > (totalIncome - targetSavings);

    res.json({
      dailyBudget: dailyBudget > 0 ? dailyBudget : 0,
      remainingSavings: remainingSavings > 0 ? remainingSavings : 0,
      overspendAlert,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Planner calculation failed", details: err.message });
  }
});

// ------------------- SERVER -------------------
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
