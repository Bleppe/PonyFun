const axios = require('axios');
const db = require('./db');

function normalizeHorseName(name) {
    if (!name) return '';
    // Remove country suffixes like (FR), (US), (IT), (NO), (FI), (SE), (DE), (DK)
    return name.replace(/\s\([A-Z]{2}\)$/i, '').trim().toUpperCase();
}

// Helper function to find the correct Swedish Horse Racing raceday ID for a given date and track
async function findSHRacedayId(date, trackName) {
    const axiosConfig = {
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Origin': 'https://www.swedishhorseracing.com',
            'Referer': 'https://www.swedishhorseracing.com/races',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*'
        }
    };

    // Try different track IDs (Swedish Horse Racing uses different IDs for different tracks)
    // Common range is 1-50, but we'll focus on likely ones
    const trackIdsToTry = [
        5, 15, 27, 32, 1, 2, 3, 4, 6, 7, 8, 9, 10, // Most common
        11, 12, 13, 14, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 28, 29, 30, 31, 33, 34, 35
    ];

    for (const trackId of trackIdsToTry) {
        try {
            const racedayId = `${date}_${trackId}`;
            const racedayUrl = `https://www.swedishhorseracing.com/services/raceday/${racedayId}`;
            const racedayResp = await axios.get(racedayUrl, axiosConfig);

            if (racedayResp.data.games && racedayResp.data.games.V85) {
                const foundTrackName = racedayResp.data.races[Object.keys(racedayResp.data.races)[0]]?.trackName;

                // Check if this is the track we're looking for
                if (foundTrackName && foundTrackName.toLowerCase().includes(trackName.toLowerCase())) {
                    console.log(`✅ Found Swedish Horse Racing raceday ID for ${trackName}: ${racedayId}`);
                    return racedayId;
                }
            }
        } catch (err) {
            // Silently continue to next ID
        }
    }

    console.warn(`⚠️  Could not find Swedish Horse Racing raceday ID for ${trackName} on ${date}`);
    return null;
}

async function scrapeV85Data(racedayId = '2025-12-25_27') {
    console.log(`Starting real scrape for raceday: ${racedayId}`);

    try {
        const axiosConfig = {
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Origin': 'https://www.swedishhorseracing.com',
                'Referer': 'https://www.swedishhorseracing.com/races',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*'
            }
        };

        // 1. Establish session baseline
        console.log('Establishing session...');
        const homepageResp = await axios.get('https://www.swedishhorseracing.com/', axiosConfig);
        const cookies = homepageResp.headers['set-cookie'];
        const sessionConfig = {
            headers: {
                ...axiosConfig.headers,
                'Cookie': cookies ? cookies.join('; ') : ''
            }
        };

        const racedayUrl = `https://www.swedishhorseracing.com/services/raceday/${racedayId}`;
        const racedayResp = await axios.get(racedayUrl, sessionConfig);
        const racedayData = racedayResp.data;

        if (!racedayData.games || !racedayData.games.V85) {
            console.error('No V85 data found for this raceday.');
            return;
        }

        const v85Races = racedayData.games.V85.races;
        const sortedRaceIds = Object.keys(v85Races).sort((a, b) => v85Races[a].legNr - v85Races[b].legNr);
        const venueName = racedayData.races[Object.keys(racedayData.races)[0]].trackName;
        const dateMatch = racedayData.date.match(/\/Date\((\d+)\)\//);
        const vDate = dateMatch ? new Date(parseInt(dateMatch[1])).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

        let currentLeg = 1;
        for (const raceId of sortedRaceIds) {
            try {
                const legNr = currentLeg++;
                console.log(`Processing SH Race: ${raceId} (Leg ${legNr})`);
                const raceUrl = `https://www.swedishhorseracing.com/services/race/${raceId}`;
                const statsUrl = `https://www.swedishhorseracing.com/services/race/${raceId}/stats`;

                // Use a slightly different config for stats if needed, potentially with a more specific Referer
                const raceConfig = {
                    headers: {
                        ...sessionConfig.headers,
                        'Referer': `https://www.swedishhorseracing.com/races`
                    }
                };

                const raceResp = await axios.get(raceUrl, raceConfig);

                // 2. Fetch stats with retries
                let statsData = {};
                let attempts = 0;
                while (attempts < 3) {
                    try {
                        const statsResp = await axios.get(statsUrl, raceConfig);
                        statsData = statsResp.data.stats;
                        break;
                    } catch (err) {
                        attempts++;
                        console.warn(`Attempt ${attempts} failed for stats ${raceId}: ${err.message}`);
                        if (attempts === 3) throw err;
                        await new Promise(r => setTimeout(r, 2000 * attempts));
                    }
                }

                const raceData = raceResp.data;

                for (const start of raceData.startResults) {
                    const originalHorseName = start.horseName || (start.horse ? start.horse.name : 'Unknown');
                    const horseNameNormalized = normalizeHorseName(originalHorseName);

                    const riderName = start.driverName || (start.driver ? (start.driver.firstName + ' ' + start.driver.lastName) : 'Unknown');
                    const horseNum = start.startNr;
                    const trainerName = start.trainerName || (start.horse && start.horse.trainer ? (start.horse.trainer.firstName + ' ' + start.horse.trainer.lastName) : 'Unknown');

                    const horseStatsData = statsData[horseNum.toString()];
                    const statsArray = horseStatsData?.horseStats || [];
                    const lifeStats = statsArray.find(p => p.period === 'Life') || {};

                    const age = start.horse?.age || horseStatsData?.age || 0;
                    const gender = start.horse?.sex || horseStatsData?.sex || 'N/A';
                    const betPercentage = start.stakeDistributions?.V85 || 0;

                    const riderId = await new Promise((resolve) => {
                        db.get(`SELECT id FROM riders WHERE name = ?`, [riderName], (err, row) => {
                            if (row) resolve(row.id);
                            else {
                                db.run(`INSERT INTO riders (name, win_rate) VALUES (?, ?)`, [riderName, 0.1], function () {
                                    resolve(this.lastID);
                                });
                            }
                        });
                    });

                    let recordAuto = 'N/A';
                    let recordVolt = 'N/A';
                    if (horseStatsData?.pastPerformances) {
                        const autos = horseStatsData.pastPerformances.filter(p => p.startMethod === 'A' && p.formattedTime && p.formattedTime !== '0');
                        const volts = horseStatsData.pastPerformances.filter(p => p.startMethod === 'V' && p.formattedTime && p.formattedTime !== '0');

                        if (autos.length > 0) {
                            recordAuto = autos.sort((a, b) => a.formattedTime.localeCompare(b.formattedTime))[0].formattedTime;
                        }
                        if (volts.length > 0) {
                            recordVolt = volts.sort((a, b) => a.formattedTime.localeCompare(b.formattedTime))[0].formattedTime;
                        }
                    }

                    const totalEarnings = lifeStats.earningSum || 0;
                    const winCount = lifeStats.first || 0;
                    const totalStarts = lifeStats.nrOfStarts || 0;

                    let recentForm = 'N/A';
                    if (horseStatsData?.pastPerformances) {
                        recentForm = horseStatsData.pastPerformances.slice(0, 5).map(p => p.formattedPlace || '0').join('');
                    }

                    // Insert/Update Horse with normalization
                    const horseId = await new Promise((resolve) => {
                        db.get(`SELECT id FROM horses WHERE UPPER(name) = ? OR UPPER(name) LIKE ?`, [horseNameNormalized, horseNameNormalized + ' (%)'], (err, row) => {
                            if (row) {
                                // Update logic - always update recent_form to show current state
                                db.run(`UPDATE horses SET age = ?, gender = ?, trainer = ?, record_auto = ?, record_volt = ?, total_earnings = ?, win_count = ?, total_starts = ?, 
                                        recent_form = ? 
                                        WHERE id = ?`,
                                    [age, gender, trainerName, recordAuto, recordVolt, totalEarnings, winCount, totalStarts, recentForm, row.id], () => resolve(row.id));
                            } else {
                                db.run(`INSERT INTO horses (name, age, gender, trainer, record_auto, record_volt, total_earnings, win_count, total_starts, recent_form) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                    [originalHorseName, age, gender, trainerName, recordAuto, recordVolt, totalEarnings, winCount, totalStarts, recentForm], function () {
                                        resolve(this.lastID);
                                    });
                            }
                        });
                    });

                    // Insert Pool Data - preserve comment and is_scratched from ATG
                    await new Promise((resolve) => {
                        db.run(`INSERT INTO v85_pools (date, track, race_number, horse_id, rider_id, horse_number, bet_percentage, comment, is_scratched) 
                                VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 0)
                                ON CONFLICT(date, track, race_number, horse_number) 
                                DO UPDATE SET
                                    horse_id = excluded.horse_id,
                                    rider_id = excluded.rider_id,
                                    bet_percentage = excluded.bet_percentage`,
                            [vDate, venueName, parseInt(legNr), horseId, riderId, horseNum, betPercentage.toFixed(1)], resolve);
                    });

                    // Insert Historical Results from Stats
                    if (horseStatsData && horseStatsData.pastPerformances) {
                        for (const perf of horseStatsData.pastPerformances.slice(0, 5)) {
                            const pos = perf.formattedPlace || 0;
                            const dist = perf.distance;
                            const pace = perf.formattedTime;
                            const track = perf.trackCode;

                            // Parse date from SH format /Date(123)/ if needed, or use as is
                            let date = 'N/A';
                            if (perf.date) {
                                const dateMatch = perf.date.match(/\/Date\((\d+)\)\//);
                                date = dateMatch ? new Date(parseInt(dateMatch[1])).toISOString().split('T')[0] : perf.date;
                            }

                            await new Promise((resolve) => {
                                db.run(`INSERT INTO race_results (horse_id, rider_id, position, km_pace, distance, track_code, date) 
                                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
                                    [horseId, riderId, pos, pace, dist, track, date], resolve);
                            });
                        }
                    }
                }
            } catch (raceError) {
                console.error(`Error processing race ${raceId}:`, raceError.message);
            }
            // Increased delay between races to avoid bot detection
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
        console.log('Real data scraping complete.');
    } catch (error) {
        console.error('Error during scraping:', error.message);
    }
}

async function scrapeV85DataATG(gameId = 'V85_2025-12-25_27_3') {
    console.log(`Starting ATG scrape for game: ${gameId}`);
    const axiosConfig = {
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept': 'application/json'
        }
    };

    try {
        const gameUrl = `https://www.atg.se/services/racinginfo/v1/api/games/${gameId}`;
        const gameResp = await axios.get(gameUrl, axiosConfig);
        const gameData = gameResp.data;

        const vDate = gameData.races[0].date || new Date().toISOString().split('T')[0];
        const venueName = gameData.races[0].track.name;

        console.log(`Clearing existing ATG pool data for ${venueName} on ${vDate}...`);
        await new Promise((resolve) => db.run(`DELETE FROM v85_pools WHERE date = ? AND track = ?`, [vDate, venueName], resolve));

        let currentLeg = 1;
        for (const raceSummary of gameData.races) {
            const raceId = raceSummary.id;
            const legNr = currentLeg++; // Use sequential leg number (1-8) instead of absolute race number
            console.log(`Processing ATG Race: ${raceId}...`);

            const raceUrl = `https://www.atg.se/services/racinginfo/v1/api/races/${raceId}`;
            const extendedUrl = `https://www.atg.se/services/racinginfo/v1/api/races/${raceId}/extended`;

            const [raceResp, extendedResp] = await Promise.all([
                axios.get(raceUrl, axiosConfig),
                axios.get(extendedUrl, axiosConfig).catch(() => ({ data: {} })) // Fail silently for extended
            ]);

            const raceData = raceResp.data;
            const extendedData = extendedResp.data;

            const commentsMap = {};
            if (extendedData && extendedData.starts) {
                for (const start of extendedData.starts) {
                    if (start.comments && start.comments.length > 0) {
                        // Prefer TR Media or take first
                        const trComment = start.comments.find(c => c.source === 'TR Media');
                        commentsMap[start.number] = trComment ? trComment.commentText : start.comments[0].commentText;
                    }
                }
            }

            for (const start of raceData.starts) {
                const originalHorseName = start.horse.name;
                const horseNameNormalized = normalizeHorseName(originalHorseName);

                const riderName = start.driver ? (start.driver.firstName + ' ' + start.driver.lastName) : 'Unknown';
                const horseNum = start.number;
                const trainerName = start.trainer ? (start.trainer.firstName + ' ' + start.trainer.lastName) : 'Unknown';
                const age = start.horse.age;
                const gender = start.horse.sex;

                // ATG V85 percentages
                const summaryStart = raceSummary.starts.find(s => s.number === horseNum);
                const betPercentage = summaryStart?.pools?.V85?.betDistribution ? summaryStart.pools.V85.betDistribution / 100 : 0;

                let riderWinRate = 0.1;
                if (start.driver && start.driver.statistics && start.driver.statistics.years) {
                    const currentYear = new Date().getFullYear().toString();
                    const lastYear = (new Date().getFullYear() - 1).toString();
                    const yearStats = start.driver.statistics.years[currentYear] || start.driver.statistics.years[lastYear];
                    if (yearStats && yearStats.winPercentage) {
                        riderWinRate = yearStats.winPercentage / 10000;
                    }
                }

                // Insert Rider with win rate
                const riderId = await new Promise((resolve) => {
                    db.get(`SELECT id FROM riders WHERE name = ?`, [riderName], (err, row) => {
                        if (row) {
                            db.run(`UPDATE riders SET win_rate = ? WHERE id = ?`, [riderWinRate, row.id], () => resolve(row.id));
                        } else {
                            db.run(`INSERT INTO riders (name, win_rate) VALUES (?, ?)`, [riderName, riderWinRate], function () {
                                resolve(this.lastID);
                            });
                        }
                    });
                });

                // Derive records and stats from horse stats if available
                let recordAuto = 'N/A';
                let recordVolt = 'N/A';
                let totalEarnings = start.horse.money || 0;
                let winCount = 0;
                let totalStarts = 0;

                const stats = start.horse.statistics || {};
                const life = stats.life || {};
                if (life.starts) {
                    winCount = life.placement ? (life.placement['1'] || 0) : 0;
                    totalStarts = life.starts;
                }

                if (start.horse.records) {
                    const rec = start.horse.records;
                    if (rec.auto) recordAuto = `${rec.auto.time.minutes}:${rec.auto.time.seconds.toString().padStart(2, '0')},${rec.auto.time.tenths}`;
                    if (rec.volt) recordVolt = `${rec.volt.time.minutes}:${rec.volt.time.seconds.toString().padStart(2, '0')},${rec.volt.time.tenths}`;
                } else if (life.records) {
                    const autos = life.records.filter(r => r.startMethod === 'auto');
                    const volts = life.records.filter(r => r.startMethod === 'volte');
                    if (autos.length > 0) {
                        const r = autos[0].time;
                        recordAuto = `${r.minutes}:${r.seconds.toString().padStart(2, '0')},${r.tenths}`;
                    }
                    if (volts.length > 0) {
                        const r = volts[0].time;
                        recordVolt = `${r.minutes}:${r.seconds.toString().padStart(2, '0')},${r.tenths}`;
                    }
                }

                // Calculate Recent Form from past performances
                let recentForm = 'N/A';
                if (start.horse.pastPerformances) {
                    recentForm = start.horse.pastPerformances.slice(0, 5)
                        .map(p => p.place || '0')
                        .reverse() // ATG usually provides newest first, reverse to match SH oldest first
                        .join('');
                }

                // Insert/Update Horse with normalization
                const horseId = await new Promise((resolve) => {
                    db.get(`SELECT id FROM horses WHERE UPPER(name) = ? OR UPPER(name) LIKE ?`, [horseNameNormalized, horseNameNormalized + ' (%)'], (err, row) => {
                        if (row) {
                            // Update logic - always update recent_form to show current state
                            db.run(`UPDATE horses SET age = ?, gender = ?, trainer = ?, record_auto = ?, record_volt = ?, total_earnings = ?, win_count = ?, total_starts = ?, 
                                    recent_form = ? 
                                    WHERE id = ?`,
                                [age, gender, trainerName, recordAuto, recordVolt, totalEarnings, winCount, totalStarts, recentForm, row.id], () => resolve(row.id));
                        } else {
                            db.run(`INSERT INTO horses (name, age, gender, trainer, record_auto, record_volt, total_earnings, win_count, total_starts, recent_form) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                [originalHorseName, age, gender, trainerName, recordAuto, recordVolt, totalEarnings, winCount, totalStarts, recentForm], function () {
                                    resolve(this.lastID);
                                });
                        }
                    });
                });

                // Insert Pool Data (OR REPLACE to handle duplicates)
                const comment = commentsMap[horseNum] || null;
                const isScratched = start.scratched ? 1 : 0;
                await new Promise((resolve) => {
                    db.run(`INSERT OR REPLACE INTO v85_pools (date, track, race_number, horse_id, rider_id, horse_number, bet_percentage, comment, is_scratched) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [vDate, venueName, legNr, horseId, riderId, horseNum, betPercentage.toFixed(1), comment, isScratched], resolve);
                });

                // Historical Results
                if (start.horse.pastPerformances) {
                    for (const perf of start.horse.pastPerformances.slice(0, 5)) {
                        const pos = perf.place || 0;
                        const dist = perf.distance;
                        const pace = perf.kmTime?.formattedTime || 'N/A';
                        const track = perf.track?.name || 'N/A';
                        const date = perf.date ? perf.date.split('T')[0] : 'N/A';

                        await new Promise((resolve) => {
                            db.run(`INSERT INTO race_results (horse_id, rider_id, position, km_pace, distance, track_code, date) 
                                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
                                [horseId, riderId, pos, pace, dist, track, date], resolve);
                        });
                    }
                }
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        console.log('ATG data scraping complete.');

        // Automatically enrich with Swedish Horse Racing data for recent_form
        console.log(`\n🔄 Enriching ${venueName} data with Swedish Horse Racing...`);
        const shRacedayId = await findSHRacedayId(vDate, venueName);
        if (shRacedayId) {
            await scrapeV85Data(shRacedayId);
            console.log(`✅ Enrichment complete for ${venueName}`);
        } else {
            console.log(`⚠️  Skipping enrichment - could not find Swedish Horse Racing data for ${venueName}`);
        }
    } catch (error) {
        console.error('Error during ATG scraping:', error.message);
    }
}

async function scrapeAllUpcomingATG() {
    console.log('Fetching all upcoming V85 games...');
    const axiosConfig = {
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept': 'application/json'
        }
    };

    try {
        // First, try to get upcoming games from ATG
        const atgGames = new Set();
        try {
            const productUrl = 'https://www.atg.se/services/racinginfo/v1/api/products/V85';
            const resp = await axios.get(productUrl, axiosConfig);
            const upcomingGames = resp.data.upcomingGames || resp.data.upcoming || [];
            console.log(`Found ${upcomingGames.length} upcoming V85 games from ATG.`);

            for (const game of upcomingGames) {
                atgGames.add(game.id);
            }
        } catch (err) {
            console.warn('Could not fetch ATG upcoming games:', err.message);
        }

        // Now check Swedish Horse Racing for V85 racedays (more comprehensive)
        const shConfig = {
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'Referer': 'https://www.swedishhorseracing.com/races',
                'Accept': 'application/json'
            }
        };

        // Get the next 7 days of potential racedays
        const today = new Date();
        const racedaysToCheck = [];

        for (let i = 0; i < 14; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() + i);
            const dateStr = checkDate.toISOString().split('T')[0];

            // Try common track IDs (we'll check if they have V85)
            // Track IDs can vary, so we'll try to discover them
            for (let trackId = 1; trackId <= 50; trackId++) {
                racedaysToCheck.push(`${dateStr}_${trackId}`);
            }
        }

        console.log(`Checking for V85 racedays in Swedish Horse Racing...`);
        const v85Racedays = [];

        // Check each potential raceday (with rate limiting)
        for (const racedayId of racedaysToCheck) {
            try {
                const racedayUrl = `https://www.swedishhorseracing.com/services/raceday/${racedayId}`;
                const racedayResp = await axios.get(racedayUrl, shConfig);

                if (racedayResp.data.games && racedayResp.data.games.V85) {
                    const trackName = racedayResp.data.races[Object.keys(racedayResp.data.races)[0]]?.trackName || 'Unknown';
                    const dateMatch = racedayResp.data.date.match(/\/Date\((\d+)\)\//);
                    const raceDate = dateMatch ? new Date(parseInt(dateMatch[1])).toISOString().split('T')[0] : racedayId.split('_')[0];

                    console.log(`Found V85 raceday: ${racedayId} (${trackName} on ${raceDate})`);
                    v85Racedays.push({ racedayId, trackName, date: raceDate });
                }
            } catch (err) {
                // Silently skip non-existent racedays
            }

            // Rate limiting to avoid overwhelming the server
            if (racedaysToCheck.indexOf(racedayId) % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        console.log(`Found ${v85Racedays.length} V85 racedays from Swedish Horse Racing.`);

        // Now scrape each V85 raceday
        // Try ATG first (better data), fall back to SH if not available
        for (const raceday of v85Racedays) {
            try {
                // Try to find corresponding ATG game ID
                let scraped = false;
                for (const atgGameId of atgGames) {
                    if (atgGameId.includes(raceday.date.replace(/-/g, '-'))) {
                        console.log(`Scraping ${raceday.racedayId} via ATG (${atgGameId})...`);
                        await scrapeV85DataATG(atgGameId);
                        scraped = true;
                        break;
                    }
                }

                // If not found in ATG, use Swedish Horse Racing scraper
                if (!scraped) {
                    console.log(`Scraping ${raceday.racedayId} via Swedish Horse Racing...`);
                    await scrapeV85Data(raceday.racedayId);
                }

                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (err) {
                console.error(`Error scraping ${raceday.racedayId}:`, err.message);
            }
        }

        console.log('All upcoming V85 games scraped.');
    } catch (error) {
        console.error('Error in scrapeAllUpcomingATG:', error.message);
    }
}

module.exports = { scrapeV85Data, scrapeV85DataATG, scrapeAllUpcomingATG };
