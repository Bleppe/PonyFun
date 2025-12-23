const axios = require('axios');

async function listRaces() {
    const axiosConfig = {
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept': 'application/json'
        }
    };

    try {
        const gameId = 'V85_2025-12-26_5_3';
        const resp = await axios.get(`https://www.atg.se/services/racinginfo/v1/api/games/${gameId}`, axiosConfig);
        resp.data.races.forEach((r, i) => {
            console.log(`Leg ${i + 1}: ${r.id}`);
        });
    } catch (e) {
        console.error(e.message);
    }
}

listRaces();
