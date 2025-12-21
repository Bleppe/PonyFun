const { scrapeAllUpcomingATG } = require('./scraper');

async function test() {
    try {
        await scrapeAllUpcomingATG();
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

test();
