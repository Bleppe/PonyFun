const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = process.env.PORT || 3005;

app.use(cors());
app.use(bodyParser.json());

const db = require('./db');

// Table creation is now handled in db.js

const { scrapeV85Data, scrapeV85DataATG, scrapeAllUpcomingATG } = require('./scraper');
const { calculateHorseAnalysis } = require('./analysis');

app.get('/api/races', (req, res) => {
    db.all(`SELECT track, race_number, date, COUNT(horse_id) as horse_count 
            FROM v85_pools 
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

app.get('/api/status', (req, res) => {
    res.json({ status: 'Backend is running' });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
