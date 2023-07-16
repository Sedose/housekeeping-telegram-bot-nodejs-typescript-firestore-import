const { promisify } = require('util');
const parse = promisify(require('csv-parse'));
const { readFile } = require('fs').promises;
const { Firestore } = require("@google-cloud/firestore");

const csvFileNames = [
    "confirmations",
    "users",
    "reminders",
    "tasks",
    "ratings",
    "taskPeriods",
    "dutyTasks",
    "duties",
];

const db = new Firestore();

async function importCsv() {
    for (const csvFileName of csvFileNames) {
        await processFile(csvFileName);
    }
}

async function processFile(csvFileName) {
    const fileContents = await readFile(`./data/${csvFileName}.csv`, 'utf8');
    const records = await parse(fileContents, { columns: true });
    try {
        await writeToFirestore(records, csvFileName);
    }
    catch (e) {
        console.error(e);
        process.exit(1);
    }
    console.log(`Wrote ${records.length} records to ${csvFileName}`);
}

async function writeToFirestore(records, csvFileName) {
    const batchCommits = [];
    let batch = db.batch();
    records.forEach((record, i) => {
        var docRef = db.collection(csvFileName).doc();
        batch.set(docRef, record);
        if ((i + 1) % 500 === 0) {
            console.log(`Writing record ${i + 1}`);
            batchCommits.push(batch.commit());
            batch = db.batch();
        }
    });
    batchCommits.push(batch.commit());
    return Promise.all(batchCommits);
}

importCsv();
