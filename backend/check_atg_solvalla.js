const axios = require('axios');

async function checkATGData() {
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
        const gameData = gameResp.data;

        const firstRace = gameData.races[0];
        console.log(`Checking Race: ${firstRace.id}`);

        const raceUrl = `https://www.atg.se/services/racinginfo/v1/api/races/${firstRace.id}`;
        const raceResp = await axios.get(raceUrl, axiosConfig);
        const raceData = raceResp.data;

        const firstStart = raceData.starts[0];
        console.log(`Horse: ${firstStart.horse.name}`);
        console.log(`Has pastPerformances: ${!!firstStart.horse.pastPerformances}`);
        if (firstStart.horse.pastPerformances) {
            console.log(`Count: ${firstStart.horse.pastPerformances.length}`);
            console.log(`Sample:`, JSON.stringify(firstStart.horse.pastPerformances[0]));
        } else {
            // Check if extended has it
            const extendedUrl = `https://www.atg.se/services/racinginfo/v1/api/races/${firstRace.id}/extended`;
            const extendedResp = await axios.get(extendedUrl, axiosConfig);
            const extendedData = extendedResp.data;
            const extStart = extendedData.starts.find(s => s.number === firstStart.number);
            console.log(`Extended Has pastPerformances: ${!!extStart?.horse?.pastPerformances}`);
        }
    } catch (err) {
        console.error('Error:', err.message);
    }
}

checkATGData();
