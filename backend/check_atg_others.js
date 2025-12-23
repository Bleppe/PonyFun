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
        const raceId = '2025-12-26_5_3';
        console.log(`Fetching ATG race: ${raceId}...`);
        const raceResp = await axios.get(`https://www.atg.se/services/racinginfo/v1/api/races/${raceId}`, axiosConfig);
        const raceData = raceResp.data;

        for (const start of raceData.starts.slice(0, 5)) {
            console.log(`Horse ${start.horse.name} (#${start.number}) - Past perfs: ${start.horse.pastPerformances ? start.horse.pastPerformances.length : 0}`);
        }
    } catch (e) {
        console.error(e.message);
    }
}

check();
