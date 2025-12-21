const axios = require('axios');

async function listRaces() {
    try {
        const resp = await axios.get('https://www.swedishhorseracing.com/services/races');
        const races = resp.data.races;
        for (const date in races) {
            for (const race of races[date]) {
                if (race.games.includes('V85') || race.games.includes('V75')) {
                    console.log(`Date: ${date}, ID: ${race.id}, Games: ${race.games.join(',')}`);
                }
            }
        }
    } catch (e) {
        console.error(e.message);
    }
}

listRaces();
