const axios = require('axios');

async function findGame() {
    const axiosConfig = {
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept': 'application/json'
        }
    };

    try {
        const productUrl = 'https://www.atg.se/services/racinginfo/v1/api/products/V85';
        const resp = await axios.get(productUrl, axiosConfig);
        const upcomingGames = resp.data.upcomingGames || resp.data.upcoming || [];

        for (const game of upcomingGames) {
            console.log(`Game: ${game.id}, Date: ${game.startTime}`);
        }
    } catch (e) {
        console.error(e.message);
    }
}

findGame();
