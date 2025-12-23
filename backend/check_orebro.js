const axios = require('axios');

async function checkOrebro() {
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
        // Correct Örebro raceday ID from the URL
        const racedayId = '2025-12-23_32';

        console.log(`Fetching raceday details for ${racedayId}...`);
        const racedayResp = await axios.get(`https://www.swedishhorseracing.com/services/raceday/${racedayId}`, axiosConfig);
        const races = racedayResp.data.races;

        console.log(`Found ${Object.keys(races).length} races`);
        console.log(`Track: ${races[Object.keys(races)[0]]?.trackName}`);

        // Get first race
        const firstRaceId = Object.keys(races)[0];
        console.log(`\nChecking first race: ${firstRaceId}`);

        const statsUrl = `https://www.swedishhorseracing.com/services/race/${firstRaceId}/stats`;
        const statsResp = await axios.get(statsUrl, axiosConfig);
        const stats = statsResp.data.stats;

        // Check first 3 horses
        const horseNums = Object.keys(stats).slice(0, 3);
        for (const horseNum of horseNums) {
            const horse = stats[horseNum];
            console.log(`\nHorse #${horseNum}: ${horse.horseName}`);
            console.log(`  Past performances available: ${horse.pastPerformances ? horse.pastPerformances.length : 0}`);

            if (horse.pastPerformances && horse.pastPerformances.length > 0) {
                const form = horse.pastPerformances.slice(0, 5).map(p => p.formattedPlace || '0').join('');
                console.log(`  Recent form: ${form}`);
            } else {
                console.log(`  ⚠️ NO PAST PERFORMANCES DATA`);
            }
        }
    } catch (e) {
        console.error('Error:', e.message);
        console.error('Response:', e.response?.data);
    }
}

checkOrebro();
