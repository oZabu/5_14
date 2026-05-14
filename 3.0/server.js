const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const db = new Database(path.join(__dirname, 'votes.db'));

// テーブル作成
db.exec(`
  CREATE TABLE IF NOT EXISTS heroes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hero_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hero_id) REFERENCES heroes(id)
  );
`);

// 初期データの投入（未登録の場合のみ）
const initialHeroes = [
  { id: 'ironman', name: 'Iron Man', color: '#AA0000' },
  { id: 'captain', name: 'Captain America', color: '#0000FF' },
  { id: 'thor', name: 'Thor', color: '#777777' },
  { id: 'spiderman', name: 'Spider-Man', color: '#FF0000' }
];

const insertHero = db.prepare('INSERT OR IGNORE INTO heroes (id, name, color) VALUES (?, ?, ?)');
initialHeroes.forEach(hero => {
  insertHero.run(hero.id, hero.name, hero.color);
});

app.use(express.json());
app.use(express.static(__dirname));

// GET /heroes: ヒーロー一覧と得票数を取得
app.get('/heroes', (req, res) => {
  const stmt = db.prepare(`
    SELECT h.id, h.name, h.color, COUNT(v.id) as count
    FROM heroes h
    LEFT JOIN votes v ON h.id = v.hero_id
    GROUP BY h.id
  `);
  const rows = stmt.all();
  res.json(rows);
});

// POST /heroes: 新しいヒーローを追加
app.post('/heroes', (req, res) => {
  const { name, color } = req.body;
  if (!name || !color) {
    return res.status(400).json({ error: 'Name and color are required' });
  }
  const id = name.toLowerCase().trim().replace(/\s+/g, '-');
  try {
    const stmt = db.prepare('INSERT INTO heroes (id, name, color) VALUES (?, ?, ?)');
    stmt.run(id, name, color);
    res.json({ success: true, id });
  } catch (err) {
    res.status(400).json({ error: 'Hero already exists or invalid data' });
  }
});

// POST /vote: 投票を保存する
app.post('/vote', (req, res) => {
  const { option } = req.body;
  if (!option) {
    return res.status(400).json({ error: 'Option is required' });
  }

  try {
    const stmt = db.prepare('INSERT INTO votes (hero_id) VALUES (?)');
    stmt.run(option);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Invalid hero ID' });
  }
});

const PORT = 3400;
app.listen(PORT, () => {
  console.log('Server is running at http://localhost:' + PORT);
});

