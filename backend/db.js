const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.resolve(__dirname, 'ponyfun.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.run('PRAGMA journal_mode = WAL');
        createTables();
    }
});

function createTables() {
    db.serialize(() => {
        // Horses table
        db.run(`CREATE TABLE IF NOT EXISTS horses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            age INTEGER,
            gender TEXT,
            trainer TEXT,
            record_auto TEXT,
            record_volt TEXT,
            total_earnings INTEGER,
            win_count INTEGER,
            total_starts INTEGER,
            recent_form TEXT
        )`);

        // Riders table
        db.run(`CREATE TABLE IF NOT EXISTS riders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            win_rate REAL,
            ranking INTEGER,
            starts INTEGER DEFAULT 0,
            first_places INTEGER DEFAULT 0,
            second_places INTEGER DEFAULT 0,
            third_places INTEGER DEFAULT 0,
            fourth_places INTEGER DEFAULT 0,
            fifth_places INTEGER DEFAULT 0
        )`, (err) => {
            if (err) console.error('Error creating riders table:', err.message);
            else {
                // Ensure columns exist for older databases
                const columns = [
                    'ranking', // Keep ranking migration for older databases
                    'starts', 'first_places', 'second_places',
                    'third_places', 'fourth_places', 'fifth_places'
                ];
                columns.forEach(col => {
                    db.run(`ALTER TABLE riders ADD COLUMN ${col} INTEGER DEFAULT 0`, (err) => {
                        // Ignore "duplicate column name" error
                    });
                });
            }
        });

        // Races table
        db.run(`CREATE TABLE IF NOT EXISTS races (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            date TEXT,
            track TEXT,
            distance INTEGER,
            condition TEXT
        )`);

        // Race Results (Historical data)
        db.run(`CREATE TABLE IF NOT EXISTS race_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            race_id INTEGER,
            horse_id INTEGER,
            rider_id INTEGER,
            position INTEGER,
            prize_money INTEGER,
            km_pace TEXT,
            distance INTEGER,
            track_code TEXT,
            date TEXT,
            FOREIGN KEY(race_id) REFERENCES races(id),
            FOREIGN KEY(horse_id) REFERENCES horses(id),
            FOREIGN KEY(rider_id) REFERENCES riders(id)
        )`);

        // Migration to add date column if it doesn't exist (for existing databases)
        db.run(`ALTER TABLE race_results ADD COLUMN date TEXT`, (err) => {
            // Ignore error if column already exists
        });

        // V85 Pool Data
        db.run(`CREATE TABLE IF NOT EXISTS v85_pools (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT,
            track TEXT,
            race_number INTEGER,
            horse_id INTEGER,
            rider_id INTEGER,
            horse_number INTEGER,
            bet_percentage REAL,
            probability REAL,
            is_scratched BOOLEAN DEFAULT 0,
            comment TEXT,
            FOREIGN KEY(horse_id) REFERENCES horses(id),
            FOREIGN KEY(rider_id) REFERENCES riders(id)
        )`);

        // Migration to add comment column if it doesn't exist
        db.run(`ALTER TABLE v85_pools ADD COLUMN comment TEXT`, (err) => {
            // Ignore error if column already exists
        });

        // Add unique constraint to prevent duplicate entries
        db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_v85_pools_unique 
                ON v85_pools(date, track, race_number, horse_number)`, (err) => {
            if (err) {
                console.log('Unique index already exists or error creating it:', err.message);
            } else {
                console.log('✅ Unique constraint added to v85_pools table');
            }
        });

        // Remove any existing duplicates (keep the most recent entry)
        db.run(`DELETE FROM v85_pools 
                WHERE id NOT IN (
                    SELECT MAX(id) 
                    FROM v85_pools 
                    GROUP BY date, track, race_number, horse_number
                )`, (err) => {
            if (err) {
                console.error('Error removing duplicates:', err.message);
            } else {
                console.log('✅ Removed any duplicate entries from v85_pools');
            }
        });
        // Selected Horses (for betting/tracking)
        db.run(`CREATE TABLE IF NOT EXISTS selected_horses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            track TEXT,
            date TEXT,
            race_number INTEGER,
            horse_number INTEGER,
            UNIQUE(track, date, race_number, horse_number) ON CONFLICT REPLACE
        )`);

    });
}

module.exports = db;
