const { scrapeV85DataATG } = require('./scraper');

async function test() {
    try {
        // Sample V85 game ID for Dec 25
        await scrapeV85DataATG('V85_2025-12-25_27_3');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

test();
