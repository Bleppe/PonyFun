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
        const raceId = '2025-12-26_5_3';
        const sUrl = `https://www.swedishhorseracing.com/services/race/${raceId}/stats`;
        console.log(`Checking stats for race ${raceId}`);

        const sResp = await axios.get(sUrl, axiosConfig);
        const stats = sResp.data.stats;

        console.log(JSON.stringify(stats, null, 2).slice(0, 5000));
    } catch (e) {
        console.error(e.message);
    }
}

check();
