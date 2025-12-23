const axios = require('axios');

async function testSolvalla() {
    const racedayId = '2025-12-26_5';
    const raceId = '2025-12-26_5_3'; // Solvalla Race 1 (V85-1 for that day?)

    const homepageResp = await axios.get('https://www.swedishhorseracing.com/');
    const cookies = homepageResp.headers['set-cookie'];
    const axiosConfig = {
        headers: {
            'Cookie': cookies ? cookies.join('; ') : '',
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept': 'application/json'
        }
    };

    try {
        console.log(`Fetching race ${raceId}...`);
        const raceResp = await axios.get(`https://www.swedishhorseracing.com/services/race/${raceId}`, axiosConfig);
        console.log('Race fetched successfully.');

        console.log(`Fetching stats for ${raceId}...`);
        const statsResp = await axios.get(`https://www.swedishhorseracing.com/services/race/${raceId}/stats`, axiosConfig);
        console.log('Stats fetched successfully.');
        const statsData = statsResp.data.stats;
        console.log('Sample stats keys:', Object.keys(statsData).slice(0, 5));
    } catch (err) {
        console.error('Fetch failed:', err.message);
        if (err.response) {
            console.error('Status:', err.response.status);
            console.error('Data Sample:', JSON.stringify(err.response.data).slice(0, 100));
        }
    }
}

testSolvalla();
