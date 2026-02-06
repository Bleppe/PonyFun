const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = process.env.PORT || 3005;

app.use(cors());
app.use(bodyParser.json());

// Performance monitoring middleware
app.use((req, res, next) => {
    const start = Date.now();

    // Capture the original end function
    const originalEnd = res.end;

    // Override the end function
    res.end = function (...args) {
        const duration = Date.now() - start;
        const logColor = duration > 1000 ? '\x1b[31m' : duration > 500 ? '\x1b[33m' : '\x1b[32m';
        const reset = '\x1b[0m';
        console.log(`${logColor}[${duration}ms]${reset} ${req.method} ${req.path}`);

        // Call the original end function
        originalEnd.apply(res, args);
    };

    next();
});

const db = require('./db');

// Table creation is now handled in db.js

const { scrapeV85Data, scrapeV85DataATG, scrapeAllUpcomingATG } = require('./scraper');
const { calculateHorseAnalysis } = require('./analysis');
const { fetchTopRiders } = require('./fetch_toplists');

app.get('/api/races', (req, res) => {
    db.all(`SELECT track, race_number, date, COUNT(horse_id) as horse_count 
            FROM v85_pools 
            WHERE date >= date('now')
            GROUP BY track, race_number, date
            ORDER BY date ASC, race_number`, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/analysis/:id', async (req, res) => {
    try {
        const raceId = req.params.id;
        const track = req.query.track;
        const date = req.query.date;

        db.all(`SELECT p.id, h.name, p.bet_percentage, p.horse_number 
                FROM v85_pools p 
                JOIN horses h ON h.id = p.horse_id 
                WHERE p.race_number = ? AND p.track = ? AND p.date = ?`, [raceId, track, date], async (err, pools) => {
            if (err) return res.status(500).json({ error: err.message });

            const results = [];
            for (const pool of pools) {
                const analysis = await calculateHorseAnalysis(pool.id);
                results.push({ ...analysis, name: pool.name, bet_percentage: pool.bet_percentage, horse_number: pool.horse_number });
            }
            // Sort by calculated win probability descending
            results.sort((a, b) => (b.calculated_probability || 0) - (a.calculated_probability || 0));
            res.json(results);
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get selections for a specific race or all selections
app.get('/api/selections', (req, res) => {
    const { track, date, race_number } = req.query;
    let query = 'SELECT * FROM selected_horses';
    let params = [];

    if (track && date) {
        query += ' WHERE track = ? AND date = ?';
        params.push(track, date);
        if (race_number) {
            query += ' AND race_number = ?';
            params.push(race_number);
        }
    }

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Add or remove a selection (toggle)
// Body: { track, date, race_number, horse_number, selected }
// If selected is true, add. If false, remove.
app.post('/api/selections', (req, res) => {
    const { track, date, race_number, horse_number, selected } = req.body;

    if (!track || !date || !race_number || !horse_number) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    if (selected) {
        db.run(`INSERT OR REPLACE INTO selected_horses (track, date, race_number, horse_number) 
                VALUES (?, ?, ?, ?)`,
            [track, date, race_number, horse_number], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'Selection saved', selected: true });
            });
    } else {
        db.run(`DELETE FROM selected_horses 
                WHERE track = ? AND date = ? AND race_number = ? AND horse_number = ?`,
            [track, date, race_number, horse_number], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'Selection removed', selected: false });
            });
    }
});

// Clear all selections for a specific race
app.delete('/api/selections', (req, res) => {
    const { track, date, race_number } = req.query;

    if (!track || !date || !race_number) {
        return res.status(400).json({ error: 'Missing required query parameters' });
    }

    db.run(`DELETE FROM selected_horses 
            WHERE track = ? AND date = ? AND race_number = ?`,
        [track, date, race_number], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Selections cleared for this race' });
        });
});

app.post('/api/scrape', async (req, res) => {
    try {
        const { source, gameId, racedayId, all } = req.body;

        if (all) {
            await scrapeAllUpcomingATG();
            return res.json({ message: 'Scraping all upcoming ATG games successful' });
        }

        if (source === 'both') {
            // Run both scrapers: ATG first for structure, then SH for enrichment
            await scrapeV85DataATG(gameId || 'V85_2025-12-25_27_3');
            await scrapeV85Data(racedayId || '2025-12-25_27');
            return res.json({ message: 'Scraping from both ATG and Swedish Horse Racing successful' });
        }

        if (source === 'sh' || source === 'swedishhorseracing') {
            await scrapeV85Data(racedayId || '2025-12-25_27');
        } else {
            // Default to ATG
            await scrapeV85DataATG(gameId || 'V85_2025-12-25_27_3');
        }
        res.json({ message: `Scraping from ${source || 'atg'} successful` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/clean-database', async (req, res) => {
    try {
        // Delete data from tables in correct order (respecting foreign keys)
        await new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run('DELETE FROM v85_pools', (err) => {
                    if (err) return reject(err);
                });
                db.run('DELETE FROM race_results', (err) => {
                    if (err) return reject(err);
                });
                db.run('DELETE FROM races', (err) => {
                    if (err) return reject(err);
                });
                db.run('DELETE FROM riders', (err) => {
                    if (err) return reject(err);
                });
                db.run('DELETE FROM horses', (err) => {
                    if (err) return reject(err);
                    resolve();
                });
            });
        });

        console.log('Database cleaned successfully');
        res.json({ message: 'Database cleaned successfully' });
    } catch (err) {
        console.error('Error cleaning database:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/top-riders', (req, res) => {
    db.all(`SELECT name, win_rate, ranking, starts, first_places, second_places, third_places, fourth_places, fifth_places FROM riders WHERE ranking IS NOT NULL ORDER BY ranking ASC LIMIT 2000`, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/fetch-toplists', async (req, res) => {
    try {
        const result = await fetchTopRiders();
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/status', (req, res) => {
    res.json({ status: 'Backend is running' });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
