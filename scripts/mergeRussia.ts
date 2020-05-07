import { russianDataUrl, dataPath, russianDataOffset } from './constants';
import { ParsedCsv, Record, RussianRecord, RussianData } from './types';
import * as stringify from 'csv-stringify/lib/sync';
import { getDayCount, getDateList } from './utils';
import { russiaPoints } from './russiaPoints';
import * as parse from 'csv-parse/lib/sync';
import { dayOne } from '../src/constants';
import fetch from 'node-fetch';
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
    const russianData: RussianData = await fetch(russianDataUrl).then((response) =>
        response.json(),
    );

    const { startDate, data } = russianData;

    if (startDate !== '03/02/2020') {
        throw new Error('Unexpected start date for Russian data');
    }

    const mergedCases = mergeRow(
        'cases',
        fs.readFileSync(path.join(dataPath, 'cases.csv'), 'utf8'),
        data,
    );
    const mergedDeaths = mergeRow(
        'deaths',
        fs.readFileSync(path.join(dataPath, 'deaths.csv'), 'utf8'),
        data,
    );

    fs.writeFileSync(path.join(dataPath, 'cases.csv'), mergedCases);
    fs.writeFileSync(path.join(dataPath, 'deaths.csv'), mergedDeaths);
}

function mergeRow(
    rowName: 'cases' | 'deaths',
    globalText: string,
    russianData: RussianRecord[],
): string {
    let records = parse(globalText, { columns: true }) as ParsedCsv;

    records = records.filter((entry) => entry['Country/Region'] !== 'Russia');

    const dayCount = getDayCount(globalText);
    const dateList = getDateList(dayOne, dayCount);

    const expectedDayCount = dayCount - russianDataOffset;

    for (const region of russianData) {
        const { name } = region;
        const point = russiaPoints[name];

        if (point === undefined) {
            throw new Error(`Unexpected Russian region name: ${name}`);
        }

        const entry: Record = {
            'Country/Region': 'Russia',
            'Province/State': name,
            Long: String(point[0]),
            Lat: String(point[1]),
        };

        let totalValue = 0;

        for (let i = 0; i < dateList.length; i++) {
            const date = dateList[i];
            const sourceRow = rowName === 'cases' ? region.confirmed : region.dead;

            if (sourceRow.length < expectedDayCount) {
                throw new Error(
                    `Not enough days in Russian data. Expected at least ${expectedDayCount}, got ${sourceRow.length}`,
                );
            }

            const value = sourceRow[i - russianDataOffset];

            if (Number.isNaN(value) || value < 0) {
                throw new Error(`Invalid ${rowName} value. Region: ${name}`);
            }

            totalValue += i < russianDataOffset ? 0 : sourceRow[i - russianDataOffset];

            entry[date] = String(totalValue);
        }

        records.push(entry);
    }

    return stringify(records, { header: true });
}
