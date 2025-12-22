const { scrapeV85Data } = require('./scraper');

async function test() {
    try {
        console.log('Running SH scraper to fetch recent form data...');
        // Default raceday is 2025-12-25_27 (Umåker)
        await scrapeV85Data();
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

test();
