const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'ponyfun.db');
const db = new sqlite3.Database(dbPath);

const scrapedData = {
    "2025-12-26_5_3": [
        { "number": 1, "name": "X.O.Kemp", "form": "81110" },
        { "number": 2, "name": "Steady Roc", "form": "X3264" },
        { "number": 3, "name": "Anacott Steel", "form": "40005" },
        { "number": 4, "name": "Pure Atlas", "form": "2X221" },
        { "number": 5, "name": "Nash Keeper", "form": "31412" },
        { "number": 6, "name": "Godfather (DK)", "form": "X1510" },
        { "number": 7, "name": "Freako", "form": "351X2" },
        { "number": 8, "name": "Västerbo Tramp", "form": "06011" },
        { "number": 9, "name": "Blue Boy Face", "form": "‒1172" },
        { "number": 10, "name": "Neymar Boko (NL)", "form": "24243" },
        { "number": 11, "name": "Steady Express", "form": "11111" },
        { "number": 12, "name": "Golden Cresent", "form": "31061" }
    ],
    "2025-12-26_5_4": [
        { "number": 1, "name": "Orosei Boko", "form": "10233" },
        { "number": 2, "name": "Alvena Roy", "form": "34181" },
        { "number": 3, "name": "Parish Crooks V.S. (NL)", "form": "21126" },
        { "number": 4, "name": "In Your Time", "form": "35054" },
        { "number": 5, "name": "The Bank Account", "form": "03142" },
        { "number": 6, "name": "Västerbo M.A.S.H.", "form": "61473" },
        { "number": 7, "name": "Västerbo All In", "form": "64311" },
        { "number": 8, "name": "Fabulous Boy (FR)", "form": "07X42" },
        { "number": 9, "name": "Muscle Morique", "form": "2X60X" },
        { "number": 10, "name": "Clodrique (NO)", "form": "1133X" }
    ],
    "2025-12-26_5_5": [
        { "number": 1, "name": "Romulus Tooma (EE)", "form": "2X202" },
        { "number": 2, "name": "Karat River", "form": "1X1X2" },
        { "number": 3, "name": "Phoenix Photo", "form": "18673" },
        { "number": 4, "name": "Demon (IT)", "form": "X6605" },
        { "number": 5, "name": "Mizai", "form": "12X28" },
        { "number": 6, "name": "Francesco Zet", "form": "11125" },
        { "number": 7, "name": "Clarissa (IT)", "form": "17111" },
        { "number": 8, "name": "Eclipse As (IT)", "form": "33227" }
    ],
    "2025-12-26_5_6": [
        { "number": 1, "name": "Ready Creation (FR)", "form": "11126" },
        { "number": 2, "name": "Bys Yubraj", "form": "13314" },
        { "number": 3, "name": "Barkley", "form": "04011" },
        { "number": 4, "name": "Youcan'taffordme", "form": "61240" },
        { "number": 5, "name": "Tangelo", "form": "X3211" },
        { "number": 6, "name": "Kattbo Hunter", "form": "22482" },
        { "number": 7, "name": "Urgent Beat", "form": "21345" },
        { "number": 8, "name": "Leverage", "form": "42111" },
        { "number": 9, "name": "Blixt Lane", "form": "‒1112" },
        { "number": 10, "name": "D'artagnan Face", "form": "X3112" },
        { "number": 11, "name": "Ebbot Rice", "form": "10X11" }
    ],
    "2025-12-26_5_7": [
        { "number": 1, "name": "Ellen Ripley", "form": "43X23" },
        { "number": 2, "name": "Solo Traveler", "form": "80600" },
        { "number": 3, "name": "Urbina Southwind", "form": "66322" },
        { "number": 4, "name": "Nephtys Boko (NL)", "form": "73071" },
        { "number": 5, "name": "Graces Bird (FR)", "form": "X0116" },
        { "number": 6, "name": "Crazy Life", "form": "04687" },
        { "number": 7, "name": "Xerava C.D.", "form": "44351" },
        { "number": 8, "name": "Jennifer Sisu", "form": "X2272" },
        { "number": 9, "name": "Staro Raili", "form": "00314" },
        { "number": 10, "name": "Nilla Lane", "form": "15111" },
        { "number": 11, "name": "Aurelia Express", "form": "46324" },
        { "number": 12, "name": "Adriatica (FR)", "form": "11211" }
    ],
    "2025-12-26_5_8": [
        { "number": 1, "name": "Idle Seabrook", "form": "33113" },
        { "number": 2, "name": "Queen Montana", "form": "10631" },
        { "number": 3, "name": "Spirit W.J.", "form": "X62X4" },
        { "number": 4, "name": "Churchill Face", "form": "13X23" },
        { "number": 5, "name": "Chribo Hill", "form": "X1111" },
        { "number": 6, "name": "Eyeforaneye Face (FR)", "form": "21132" },
        { "number": 7, "name": "Cabin Pressure", "form": "11671" },
        { "number": 8, "name": "Licorice Sisu", "form": "12033" },
        { "number": 9, "name": "Lonely Nights", "form": "41110" },
        { "number": 10, "name": "Fantastic Hall", "form": "X1212" },
        { "number": 11, "name": "Diego Face (FR)", "form": "X32XX" },
        { "number": 12, "name": "Chippen Dee", "form": "X3X42" }
    ],
    "2025-12-26_5_9": [
        { "number": 1, "name": "Flotilla", "form": "X4045" },
        { "number": 2, "name": "Tamacti Jun", "form": "11831" },
        { "number": 3, "name": "King of Djazz", "form": "11111" },
        { "number": 4, "name": "Make Or Break Zaz", "form": "44516" },
        { "number": 5, "name": "Parveny", "form": "2X014" },
        { "number": 6, "name": "Frank S.H.", "form": "70X22" },
        { "number": 7, "name": "Kinky Boots", "form": "114X1" },
        { "number": 8, "name": "Betting Pacer", "form": "01343" },
        { "number": 9, "name": "Zaxton", "form": "34153" },
        { "number": 10, "name": "August Zonett", "form": "28065" },
        { "number": 11, "name": "Boscha Diablo", "form": "712X1" }
    ],
    "2025-12-26_5_10": [
        { "number": 1, "name": "Chocolatemere", "form": "3X1X3" },
        { "number": 2, "name": "Luck is for Losers", "form": "18120" },
        { "number": 3, "name": "Run Like Brodda", "form": "4061X" },
        { "number": 4, "name": "Day Time Trot", "form": "12302" },
        { "number": 5, "name": "Tactic Lane", "form": "20X14" },
        { "number": 6, "name": "Joelynn (FR)", "form": "44142" },
        { "number": 7, "name": "Official Sox (FR)", "form": "50111" },
        { "number": 8, "name": "Princess of Divine", "form": "12630" },
        { "number": 9, "name": "Donna Inez", "form": "X5422" },
        { "number": 10, "name": "Supernova Lyjam", "form": "00831" },
        { "number": 11, "name": "Amara Cay Inn", "form": "012X2" },
        { "number": 12, "name": "Mary Wadd", "form": "03358" },
        { "number": 13, "name": "Adele Gel", "form": "2X161" },
        { "number": 14, "name": "Love Bites (US)", "form": "01121" },
        { "number": 15, "name": "M.T.Tomorrows Hope", "form": "51183" }
    ]
};

function normalizeHorseName(name) {
    if (!name) return '';
    // Strip country suffixes like (FR), (US), (DK), (NL), (EE), (NO), (IT)
    return name.replace(/\s\([A-Z]{2}\)$/, '').toUpperCase().trim();
}

async function updateForm() {
    let updatedCount = 0;
    let missingCount = 0;

    for (const raceId in scrapedData) {
        console.log(`Processing Race: ${raceId}`);
        const horses = scrapedData[raceId];

        for (const horse of horses) {
            const normalized = normalizeHorseName(horse.name);
            const form = horse.form;

            const horseId = await new Promise((resolve) => {
                db.get(`SELECT id, name FROM horses WHERE UPPER(name) = ? OR UPPER(name) LIKE ?`, [normalized, normalized + ' (%)'], (err, row) => {
                    if (row) {
                        resolve(row.id);
                    } else {
                        resolve(null);
                    }
                });
            });

            if (horseId) {
                await new Promise((resolve) => {
                    db.run(`UPDATE horses SET recent_form = ? WHERE id = ?`, [form, horseId], (err) => {
                        if (err) console.error(`Error updating ${horse.name}:`, err);
                        else updatedCount++;
                        resolve();
                    });
                });
            } else {
                console.warn(`Horse not found in DB: ${horse.name} (normalized: ${normalized})`);
                missingCount++;
            }
        }
    }

    console.log(`\nFinished updating.`);
    console.log(`Updated: ${updatedCount} horses`);
    console.log(`Missing in DB: ${missingCount} horses`);
    db.close();
}

updateForm();
