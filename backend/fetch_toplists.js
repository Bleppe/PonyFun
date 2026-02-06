const axios = require('axios');
const db = require('./db');

async function fetchTopRiders() {
    console.log('Fetching top riders from Travsport...');

    // Reset all rankings first to ensure only current top riders have rankings
    await new Promise((resolve) => {
        db.run('UPDATE riders SET ranking = NULL', (err) => {
            if (err) console.error('Error resetting rankings:', err.message);
            resolve();
        });
    });

    const url = 'https://api.travsport.se/webapi/charts/listpersonchart/organisation/TROT?breed=B&category=1&chartTypeSearchParam=1&gender=B&homeTrack=S&licenseType=S&list=S&onlyYouth=false&raceOnTrack=A&returnNumberOfEntries=2000&sulkyOrMonte=B&typeOfRace=B&year=2026';

    try {
        const response = await axios.get(url, {
            headers: {
                'Accept': 'application/json',
                'Origin': 'https://sportapp.travsport.se'
            }
        });

        const riders = response.data;
        console.log(`Received ${riders.length} riders.`);

        let updatedCount = 0;
        for (let i = 0; i < riders.length; i++) {
            const rider = riders[i];
            const ranking = i + 1;
            const name = rider.name;
            const winRate = rider.winningPercent / 100;
            const starts = rider.numberOfStarts;
            const first = rider.numberOfFirstPlaces;
            const second = rider.numberOfSecondPlaces;
            const third = rider.numberOfThirdPlaces;
            const fourth = rider.numberOfFourthPlaces;
            const fifth = rider.numberOfFifthPlaces;

            await new Promise((resolve) => {
                db.run(`INSERT INTO riders (name, win_rate, ranking, starts, first_places, second_places, third_places, fourth_places, fifth_places) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(name) DO UPDATE SET 
                            win_rate = excluded.win_rate,
                            ranking = excluded.ranking,
                            starts = excluded.starts,
                            first_places = excluded.first_places,
                            second_places = excluded.second_places,
                            third_places = excluded.third_places,
                            fourth_places = excluded.fourth_places,
                            fifth_places = excluded.fifth_places`,
                    [name, winRate, ranking, starts, first, second, third, fourth, fifth], (err) => {
                        if (err) console.error(`Error updating rider ${name}:`, err.message);
                        else updatedCount++;
                        resolve();
                    });
            });
        }

        console.log(`Successfully updated ${updatedCount} riders with rankings.`);
        return { success: true, count: updatedCount };
    } catch (error) {
        console.error('Error fetching top riders:', error.message);
        return { success: false, error: error.message };
    }
}

if (require.main === module) {
    fetchTopRiders().then(() => {
        console.log('Done.');
        process.exit(0);
    });
}

module.exports = { fetchTopRiders };
