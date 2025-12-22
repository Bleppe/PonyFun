const axios = require('axios');
const db = require('./db');

async function scrapeV85Data(racedayId = '2025-12-25_27') {
    console.log(`Starting real scrape for raceday: ${racedayId}`);

    try {
        // Establish session by visiting homepage first
        const homepageResp = await axios.get('https://www.swedishhorseracing.com/', {
            withCredentials: true
        });
        const cookies = homepageResp.headers['set-cookie'];
        const axiosConfig = {
            headers: {
                'Cookie': cookies ? cookies.join('; ') : '',
                'X-Requested-With': 'XMLHttpRequest',
                'Origin': 'https://www.swedishhorseracing.com',
                'Referer': 'https://www.swedishhorseracing.com/races',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*'
            }
        };

        // Selective clear logic moved inside the race loop or handled per track/date

        const racedayUrl = `https://www.swedishhorseracing.com/services/raceday/${racedayId}`;
        const racedayResp = await axios.get(racedayUrl, axiosConfig);
        const racedayData = racedayResp.data;

        if (!racedayData.games || !racedayData.games.V85) {
            console.error('No V85 data found for this raceday.');
            return;
        }

        const v85Races = racedayData.games.V85.races;
        const venueName = racedayData.races[Object.keys(racedayData.races)[0]].trackName;
        // Parse date from /Date(1766188800000)/
        const dateMatch = racedayData.date.match(/\/Date\((\d+)\)\//);
        const vDate = dateMatch ? new Date(parseInt(dateMatch[1])).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

        // Don't delete existing data - we're enriching ATG data, not replacing it
        // This allows dual-source scraping where ATG provides structure and SH enriches with details
        // console.log(`Clearing existing V85 pool data for ${venueName} on ${vDate}...`);
        // await new Promise((resolve) => db.run(`DELETE FROM v85_pools WHERE date = ? AND track = ?`, [vDate, venueName], resolve));

        const sortedRaceIds = Object.keys(v85Races).sort((a, b) => v85Races[a].legNr - v85Races[b].legNr);
        let currentLeg = 1;
        for (const raceId of sortedRaceIds) {
            const legNr = currentLeg++; // Force sequential leg numbers (1-8)
            console.log(`Processing Leg ${legNr} (Race ID: ${raceId})...`);

            const raceUrl = `https://www.swedishhorseracing.com/services/race/${raceId}`;
            const statsUrl = `https://www.swedishhorseracing.com/services/race/${raceId}/stats`;

            const [raceResp, statsResp] = await Promise.all([
                axios.get(raceUrl, axiosConfig),
                axios.get(statsUrl, axiosConfig)
            ]);

            const raceData = raceResp.data;
            const statsData = statsResp.data.stats;

            console.log(`raceData keys: ${Object.keys(raceData).join(', ')}`);
            console.log(`statsResp.data keys: ${Object.keys(statsResp.data || {}).join(', ')}`);
            if (statsResp.data.bestTimes) {
                console.log(`bestTimes sample:`, JSON.stringify(statsResp.data.bestTimes, null, 2));
            }

            for (const start of raceData.startResults) {
                const horseName = start.horseName || (start.horse ? start.horse.name : 'Unknown');
                const riderName = start.driverName || (start.driver ? (start.driver.firstName + ' ' + start.driver.lastName) : 'Unknown');
                const horseNum = start.startNr;
                const trainerName = start.trainerName || (start.horse && start.horse.trainer ? (start.horse.trainer.firstName + ' ' + start.horse.trainer.lastName) : 'Unknown');

                const horseStatsData = statsData[horseNum.toString()];
                const statsArray = horseStatsData?.horseStats || [];
                const lifeStats = statsArray.find(p => p.period === 'Life') || {};

                const age = start.horse?.age || horseStatsData?.age || 0;
                const gender = start.horse?.sex || horseStatsData?.sex || 'N/A';

                // Get V85 percentage
                const betPercentage = start.betDistribution ? (start.betDistribution.V85 || 0) * 100 : 0;

                // Insert Rider
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

                // Derive records from past performances
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

                // Calculate Recent Form
                let recentForm = 'N/A';
                if (horseStatsData?.pastPerformances) {
                    recentForm = horseStatsData.pastPerformances.slice(0, 5).map(p => {
                        const place = parseInt(p.place);
                        if (isNaN(place)) return '0';
                        return place === 1 ? '1' : place === 2 ? '2' : place === 3 ? '3' : '0';
                    }).join('');
                }

                // Insert/Update Horse
                const horseId = await new Promise((resolve) => {
                    db.get(`SELECT id FROM horses WHERE name = ?`, [horseName], (err, row) => {
                        if (row) {
                            db.run(`UPDATE horses SET age = ?, gender = ?, trainer = ?, record_auto = ?, record_volt = ?, total_earnings = ?, win_count = ?, total_starts = ?, recent_form = ? WHERE id = ?`,
                                [age, gender, trainerName, recordAuto, recordVolt, totalEarnings, winCount, totalStarts, recentForm, row.id], () => resolve(row.id));
                        } else {
                            db.run(`INSERT INTO horses (name, age, gender, trainer, record_auto, record_volt, total_earnings, win_count, total_starts, recent_form) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                [horseName, age, gender, trainerName, recordAuto, recordVolt, totalEarnings, winCount, totalStarts, recentForm], function () {
                                    resolve(this.lastID);
                                });
                        }
                    });
                });

                // Insert Pool Data (OR IGNORE to avoid duplicates when enriching ATG data)
                await new Promise((resolve) => {
                    db.run(`INSERT OR IGNORE INTO v85_pools (date, track, race_number, horse_id, rider_id, horse_number, bet_percentage) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [vDate, venueName, parseInt(legNr), horseId, riderId, horseNum, betPercentage.toFixed(1)], resolve);
                });

                // Insert Historical Results from Stats
                if (horseStatsData && horseStatsData.pastPerformances) {
                    for (const perf of horseStatsData.pastPerformances.slice(0, 5)) {
                        const pos = parseInt(perf.formattedPlace) || 0;
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
            // Small delay between races
            await new Promise(resolve => setTimeout(resolve, 1000));
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

        if (!gameData.races) {
            console.error('No races found in ATG game data.');
            return;
        }

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
                if (!start.horse.logged) {
                    console.log('ATG Horse Sample:', JSON.stringify(start.horse, null, 2));
                }
                const horseName = start.horse.name;
                const riderName = start.driver ? (start.driver.firstName + ' ' + start.driver.lastName) : 'Unknown';
                const horseNum = start.number;
                const trainerName = start.trainer ? (start.trainer.firstName + ' ' + start.trainer.lastName) : 'Unknown';
                const age = start.horse.age;
                const gender = start.horse.sex;

                // ATG V85 percentages are in various places, checking pools
                const betPercentage = start.pools?.V85?.percentage || 0;

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

                // Calculate Recent Form from statistics
                let recentForm = 'N/A';
                if (stats.years) {
                    const currentYear = new Date().getFullYear().toString();
                    const lastYear = (new Date().getFullYear() - 1).toString();
                    const yearStats = stats.years[currentYear] || stats.years[lastYear];

                    if (yearStats && yearStats.placement) {
                        // Build synthetic recent form from placement counts
                        const placement = yearStats.placement;
                        const wins = placement['1'] || 0;
                        const seconds = placement['2'] || 0;
                        const thirds = placement['3'] || 0;

                        // Create form string: wins as '1', seconds as '2', thirds as '3'
                        let formArray = [];
                        for (let i = 0; i < wins; i++) formArray.push('1');
                        for (let i = 0; i < seconds; i++) formArray.push('2');
                        for (let i = 0; i < thirds; i++) formArray.push('3');

                        // Pad with 0s if needed to make it 5 characters, or take last 5
                        if (formArray.length > 0) {
                            while (formArray.length < 5) formArray.push('0');
                            recentForm = formArray.slice(0, 5).join('');
                        }
                    }
                }

                // Insert/Update Horse
                const horseId = await new Promise((resolve) => {
                    db.get(`SELECT id FROM horses WHERE name = ?`, [horseName], (err, row) => {
                        if (row) {
                            // Update including recent_form
                            db.run(`UPDATE horses SET age = ?, gender = ?, trainer = ?, record_auto = ?, record_volt = ?, total_earnings = ?, win_count = ?, total_starts = ?, recent_form = ? WHERE id = ?`,
                                [age, gender, trainerName, recordAuto, recordVolt, totalEarnings, winCount, totalStarts, recentForm, row.id], () => resolve(row.id));
                        } else {
                            db.run(`INSERT INTO horses (name, age, gender, trainer, record_auto, record_volt, total_earnings, win_count, total_starts, recent_form) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                [horseName, age, gender, trainerName, recordAuto, recordVolt, totalEarnings, winCount, totalStarts, recentForm], function () {
                                    resolve(this.lastID);
                                });
                        }
                    });
                });

                // Insert Pool Data
                const comment = commentsMap[horseNum] || null;
                await new Promise((resolve) => {
                    db.run(`INSERT INTO v85_pools (date, track, race_number, horse_id, rider_id, horse_number, bet_percentage, comment) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [vDate, venueName, legNr, horseId, riderId, horseNum, betPercentage.toFixed(1), comment], resolve);
                });

                // Historical Results
                if (start.horse.pastPerformances) {
                    for (const perf of start.horse.pastPerformances.slice(0, 5)) {
                        const pos = parseInt(perf.place) || 0;
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
    } catch (error) {
        console.error('Error during ATG scraping:', error.message);
    }
}

async function scrapeAllUpcomingATG() {
    console.log('Fetching all upcoming V85 games from ATG...');
    const axiosConfig = {
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept': 'application/json'
        }
    };

    try {
        const productUrl = 'https://www.atg.se/services/racinginfo/v1/api/products/V85';
        const resp = await axios.get(productUrl, axiosConfig);
        const upcomingGames = resp.data.upcomingGames || resp.data.upcoming || [];

        console.log(`Found ${upcomingGames.length} upcoming V85 games in ATG response.`);
        if (upcomingGames.length === 0) {
            console.log('Response keys:', Object.keys(resp.data).join(', '));
        }

        for (const game of upcomingGames) {
            console.log(`Scheduling scrape for game: ${game.id} (${game.startTime})`);
            await scrapeV85DataATG(game.id);
            // Small delay between games
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        console.log('All upcoming ATG games scraped.');
    } catch (error) {
        console.error('Error fetching upcoming ATG games:', error.message);
    }
}

module.exports = { scrapeV85Data, scrapeV85DataATG, scrapeAllUpcomingATG };
