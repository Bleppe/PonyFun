const axios = require('axios');

async function check() {
    const axiosConfig = {
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Origin': 'https://www.swedishhorseracing.com',
            'Referer': 'https://www.swedishhorseracing.com/races',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*'
        }
    };

    try {
        const racedayId = '2025-12-26_5'; // Corrected ID from browser subagent

        console.log(`Fetching raceday details for ${racedayId}...`);
        const racedayResp = await axios.get(`https://www.swedishhorseracing.com/services/raceday/${racedayId}`, axiosConfig);
        const races = racedayResp.data.races;

        for (const rId in races) {
            const race = races[rId];
            const sUrl = `https://www.swedishhorseracing.com/services/race/${rId}/stats`;
            console.log(`Checking stats for race ${rId} (${race.trackName} Leg ${race.legNr})`);

            try {
                const sResp = await axios.get(sUrl, axiosConfig);
                const stats = sResp.data.stats;

                for (const horseNum in stats) {
                    const horse = stats[horseNum];
                    if (horse.horseName && horse.horseName.includes('Västerbo')) {
                        console.log(`Found ${horse.horseName} (#${horseNum})`);
                        console.log(`  Past performances: ${horse.pastPerformances ? horse.pastPerformances.length : 0}`);
                        if (horse.pastPerformances && horse.pastPerformances.length > 0) {
                            const form = horse.pastPerformances.slice(0, 5).map(p => p.formattedPlace || '0').join('');
                            console.log(`  Calculated form: ${form}`);
                        }
                    }
                }
            } catch (err) {
                console.error(`  Failed to fetch stats for race ${rId}: ${err.message}`);
            }
        }
    } catch (e) {
        console.error(e.message);
    }
}

check();
