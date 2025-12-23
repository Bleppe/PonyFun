const axios = require('axios');

async function check() {
    const axiosConfig = {
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept': 'application/json'
        }
    };

    try {
        const gameId = 'V85_2025-12-26_5_3';
        console.log(`Fetching ATG game: ${gameId}...`);
        const gameResp = await axios.get(`https://www.atg.se/services/racinginfo/v1/api/games/${gameId}`, axiosConfig);
        const races = gameResp.data.races;

        for (const raceSummary of races) {
            const raceId = raceSummary.id;
            const raceResp = await axios.get(`https://www.atg.se/services/racinginfo/v1/api/races/${raceId}`, axiosConfig);
            const raceData = raceResp.data;

            for (const start of raceData.starts) {
                if (start.horse.name.includes('Västerbo')) {
                    console.log(`Found ${start.horse.name} (#${start.number}) in race ${raceId}`);
                    console.log(`Past performances: ${start.horse.pastPerformances ? start.horse.pastPerformances.length : 0}`);
                    if (start.horse.pastPerformances && start.horse.pastPerformances.length > 0) {
                        console.log(`Places: ${start.horse.pastPerformances.map(p => p.place || '0').join(', ')}`);
                    }
                }
            }
        }
    } catch (e) {
        console.error(e.message);
    }
}

check();
