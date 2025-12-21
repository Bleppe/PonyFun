const { scrapeV85Data } = require('./scraper');

async function test() {
    try {
        await scrapeV85Data('2025-12-25_27');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

test();
