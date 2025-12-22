const db = require('./db');

/**
 * Calculates win probability based on:
 * 1. Historical win rate of the horse.
 * 2. Rider win rate.
 * 3. Recent form.
 */
async function calculateHorseAnalysis(poolId) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT h.id, h.name, h.total_earnings, h.win_count, h.total_starts, h.record_auto, h.record_volt, h.recent_form,
                r.name as rider_name, r.win_rate as rider_win_rate, p.bet_percentage, p.horse_number, p.comment
                FROM v85_pools p
                JOIN horses h ON h.id = p.horse_id
                LEFT JOIN riders r ON r.id = p.rider_id
                WHERE p.id = ?`, [poolId], (err, horse) => {
            if (err) return reject(err);
            if (!horse) return resolve({ name: 'Unknown', calculated_probability: 0, rider: 'N/A', recent_form: 'N/A' });

            // 1. Overall Win Rate (Life)
            const horseWinRate = horse.total_starts > 0 ? horse.win_count / horse.total_starts : 0.1;

            // 2. Rider Win Rate
            const riderWinRate = horse.rider_win_rate || 0.1;

            db.all(`SELECT position, km_pace FROM race_results WHERE horse_id = ? ORDER BY id DESC LIMIT 5`, [horse.id], (err, results) => {
                const placements = results.map(r => r.position);

                // 3. Recent Form (last 5 starts)
                let formScore = 0;
                if (placements.length > 0) {
                    const recentWeight = [1.0, 0.8, 0.6, 0.4, 0.2];
                    placements.forEach((p, i) => {
                        if (p > 0 && p <= 3) formScore += (4 - p) * recentWeight[i];
                    });
                }
                const normalizedForm = Math.min(formScore / 6, 1); // Max score around 6

                // 4. Class Factor (Earnings)
                // Normalize earnings - assuming 5M SEK is top class
                const classScore = Math.min(horse.total_earnings / 5000000, 1);

                // 5. Probability calculation
                // Weights: WinRate (30%), Rider (20%), Form (40%), Class (10%)
                const rawProb = (horseWinRate * 0.3) + (riderWinRate * 0.2) + (normalizedForm * 0.4) + (classScore * 0.1);

                // Convert to percentage and clamp
                const calculatedProbability = Math.min(Math.max(rawProb * 100, 1), 70);

                // Calculate recent form string from results
                // Results come in DESC order (most recent first), but we want oldest first
                let recentFormString = 'N/A';
                if (results && results.length > 0) {
                    recentFormString = results.reverse().map(r => {
                        const pos = r.position;
                        if (pos === 1) return '1';
                        if (pos === 2) return '2';
                        if (pos === 3) return '3';
                        return '0';
                    }).join('');
                }

                // Use calculated form if stored form is N/A, otherwise use stored
                const finalRecentForm = (horse.recent_form && horse.recent_form !== 'N/A') ? horse.recent_form : recentFormString;

                resolve({
                    horse_id: horse.id,
                    horse_number: horse.horse_number,
                    calculated_probability: (calculatedProbability / 100).toFixed(4),
                    rider: horse.rider_name || 'Pro Driver',
                    recent_form: finalRecentForm,
                    record_auto: horse.record_auto,
                    record_volt: horse.record_volt,
                    total_earnings: horse.total_earnings,
                    comment: horse.comment
                });
            });
        });
    });
}

module.exports = { calculateHorseAnalysis };
