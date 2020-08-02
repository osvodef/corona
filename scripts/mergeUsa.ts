import * as stringify from 'csv-stringify/lib/sync';
import { getDayCount, getDateList } from './utils';
import { baseUrl, dataPath } from './constants';
import { ParsedCsv, Record } from './types';
import * as parse from 'csv-parse/lib/sync';
import { dayOne } from '../src/constants';
import fetch from 'node-fetch';
import * as path from 'path';
import * as fs from 'fs';

const confirmedUrl = `${baseUrl}/time_series_covid19_confirmed_US.csv`;
const deathsUrl = `${baseUrl}/time_series_covid19_deaths_US.csv`;

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
        await fetch(confirmedUrl).then((response) => response.text()),
    );

    const mergedDeaths = mergeRow(
        fs.readFileSync(path.join(dataPath, 'deaths.csv'), 'utf8'),
        await fetch(deathsUrl).then((response) => response.text()),
    );

    fs.writeFileSync(path.join(dataPath, 'cases.csv'), mergedCases);
    fs.writeFileSync(path.join(dataPath, 'deaths.csv'), mergedDeaths);
}

function mergeRow(globalText: string, usaText: string): string {
    let globalRecords = parse(globalText, { columns: true }) as ParsedCsv;
    let usaRecords = parse(usaText, { columns: true }) as ParsedCsv;

    globalRecords = globalRecords.filter((entry) => entry['Country/Region'] !== 'US');

    const dayCount = getDayCount(globalText);
    const dateList = getDateList(dayOne, dayCount, 'M/D/YY');

    const recordsByState: { [state: string]: Record[] } = {};
    for (const record of usaRecords) {
        const state = record['Province_State'];

        if (recordsByState[state] === undefined) {
            recordsByState[state] = [];
        }

        recordsByState[state].push(record);
    }

    for (const state in recordsByState) {
        const records = recordsByState[state];

        const valuesByDate: { [date: string]: number } = {};

        for (const date of dateList) {
            valuesByDate[date] = 0;
        }

        let lngSum = 0;
        let latSum = 0;
        let pointCount = 0;

        for (const record of records) {
            const lng = Number(record['Long_']);
            const lat = Number(record['Lat']);

            if (lng !== 0 && lat !== 0) {
                lngSum += Number(record['Long_']);
                latSum += Number(record['Lat']);
                pointCount++;
            }

            for (const date of dateList) {
                valuesByDate[date] += Number(record[date]);
            }
        }

        const avgLng = pointCount !== 0 ? lngSum / pointCount : 0;
        const avgLat = pointCount !== 0 ? latSum / pointCount : 0;

        const outputRecord: Record = {
            'Country/Region': 'US',
            'Province/State': state,
            Long: String(avgLng),
            Lat: String(avgLat),
        };
        for (const date of dateList) {
            outputRecord[date] = String(valuesByDate[date]);
        }

        globalRecords.push(outputRecord);
    }

    return stringify(globalRecords, { header: true });
}
