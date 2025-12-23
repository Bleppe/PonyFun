const axios = require('axios');

async function checkATGHorse() {
    const gameId = 'V85_2025-12-26_5_3';
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
        const raceId = gameResp.data.races[0].id;

        const raceUrl = `https://www.atg.se/services/racinginfo/v1/api/races/${raceId}`;
        const raceResp = await axios.get(raceUrl, axiosConfig);
        const horseId = raceResp.data.starts[0].horse.id;
        console.log(`Checking Horse ID: ${horseId} (Name: ${raceResp.data.starts[0].horse.name})`);

        const horseUrl = `https://www.atg.se/services/racinginfo/v1/api/horses/${horseId}`;
        const horseResp = await axios.get(horseUrl, axiosConfig);
        const horseData = horseResp.data;

        console.log(`Has pastPerformances: ${!!horseData.pastPerformances}`);
        if (horseData.pastPerformances) {
            console.log(`Count: ${horseData.pastPerformances.length}`);
        }
    } catch (err) {
        console.error('Error:', err.message);
    }
}

checkATGHorse();
