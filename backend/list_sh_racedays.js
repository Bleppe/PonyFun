const axios = require('axios');

async function listRacedays() {
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
        console.log('Fetching homepage for session...');
        await axios.get('https://www.swedishhorseracing.com/', axiosConfig);

        console.log('Fetching calendars...');
        const resp = await axios.get('https://www.swedishhorseracing.com/services/calendar/2025-12', axiosConfig);
        const calendar = resp.data;

        for (const date in calendar) {
            if (date.startsWith('2025-12-26')) {
                console.log(`Racedays for ${date}:`, JSON.stringify(calendar[date]));
            }
        }
    } catch (e) {
        console.error(e.message);
    }
}

listRacedays();
