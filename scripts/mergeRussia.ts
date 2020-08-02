import * as stringify from 'csv-stringify/lib/sync';
import { getDayCount, getDateList } from './utils';
import { ParsedCsv, Record } from './types';
import * as parse from 'csv-parse/lib/sync';
import { dayOne } from '../src/constants';
import { dataPath } from './constants';
import * as path from 'path';
import * as fs from 'fs';

run();

async function run() {
    try {
        await merge();
    } catch (e) {
        console.log(e);
        process.exit(-1);
    }
}

async function merge(): Promise<void> {
    const mergedCases = mergeRow(
        fs.readFileSync(path.join(dataPath, 'cases.csv'), 'utf8'),
        fs.readFileSync(path.join(dataPath, 'russia', 'cases.csv'), 'utf8'),
    );

    const mergedDeaths = mergeRow(
        fs.readFileSync(path.join(dataPath, 'deaths.csv'), 'utf8'),
        fs.readFileSync(path.join(dataPath, 'russia', 'deaths.csv'), 'utf8'),
    );

    fs.writeFileSync(path.join(dataPath, 'cases.csv'), mergedCases);
    fs.writeFileSync(path.join(dataPath, 'deaths.csv'), mergedDeaths);
}

function mergeRow(globalText: string, russiaText: string): string {
    let globalRecords = parse(globalText, { columns: true }) as ParsedCsv;
    let russiaRecords = parse(russiaText, { columns: true }) as ParsedCsv;

    globalRecords = globalRecords.filter((entry) => entry['Country/Region'] !== 'Russia');

    const dayCount = getDayCount(globalText);
    const unpaddedDates = getDateList(dayOne, dayCount, 'M/D/YY');
    const paddedDates = getDateList(dayOne, dayCount, 'MM/DD/YY');

    for (const record of russiaRecords) {
        const state = record['Province_State'];

        const outputRecord: Record = {
            'Country/Region': 'Russia',
            'Province/State': state,
            Long: record['Long_'],
            Lat: record['Lat'],
        };

        for (let i = 0; i < dayCount; i++) {
            outputRecord[unpaddedDates[i]] = record[paddedDates[i]];
        }

        globalRecords.push(outputRecord);
    }

    return stringify(globalRecords, { header: true });
}
