import { getDayCount, getDateList, equalArrays } from './utils';
import { dataPath, usedColumns } from './constants';
import * as stringify from 'csv-stringify/lib/sync';
import * as parse from 'csv-parse/lib/sync';
import { dayOne } from '../src/constants';
import { ParsedCsv } from './types';
import * as path from 'path';
import * as fs from 'fs';

run();

async function run() {
    try {
        await validate();
    } catch (e) {
        console.log(e);
        process.exit(-1);
    }
}

function validate(): void {
    const casesText = fs.readFileSync(path.join(dataPath, 'cases.csv'), 'utf8');
    const deathsText = fs.readFileSync(path.join(dataPath, 'deaths.csv'), 'utf8');

    const casesHeaders = parse(casesText)[0] as string[];
    const deathsHeaders = parse(deathsText)[0] as string[];

    const cases = parse(casesText, { columns: true }) as ParsedCsv;
    const deaths = parse(deathsText, { columns: true }) as ParsedCsv;

    if (getDayCount(casesText) !== getDayCount(deathsText)) {
        throw new Error("Day counts for cases and deaths don't match");
    }

    if (!equalArrays(casesHeaders, deathsHeaders)) {
        throw new Error('Cases and deaths files have different column sets');
    }

    const dayCount = getDayCount(casesText);
    const dateList = getDateList(dayOne, dayCount);

    for (const date of dateList) {
        if (!casesHeaders.includes(date)) {
            throw new Error(`Cases file doesn't have date ${date}`);
        }

        if (!deathsHeaders.includes(date)) {
            throw new Error(`Deaths file doesn't have date ${date}`);
        }
    }

    for (const column of usedColumns) {
        if (!casesHeaders.includes(column)) {
            throw new Error(`Cases file doesn't have column ${column}`);
        }

        if (!deathsHeaders.includes(column)) {
            throw new Error(`Deaths file doesn't have column ${column}`);
        }
    }

    if (cases.length !== deaths.length) {
        throw new Error('Cases and deaths files have different number of regions');
    }

    for (let i = 0; i < cases.length; i++) {
        const casesRecord = cases[i];
        const deathsRecord = deaths[i];

        if (
            casesRecord['Country/Region'] !== deathsRecord['Country/Region'] ||
            casesRecord['Province/State'] !== deathsRecord['Province/State']
        ) {
            throw new Error(`Country/region names mismatch in row #${i}`);
        }

        const casesLon = Number(casesRecord['Long']);
        const casesLng = Number(casesRecord['Lat']);

        const deathsLon = Number(deathsRecord['Long']);
        const deathsLng = Number(deathsRecord['Lat']);

        if (
            Math.round(casesLon) !== Math.round(deathsLon) ||
            Math.round(casesLng) !== Math.round(deathsLng)
        ) {
            throw new Error(`Coordinates mismatch in row #${i}`);
        }

        const lon = casesLon;
        const lng = casesLng;
        if (Number.isNaN(lon) || lon < -180 || lon > 180) {
            throw new Error(`Invalid longtitude, row #${i}`);
        }
        if (Number.isNaN(lng) || lng < -90 || lng > 90) {
            throw new Error(`Invalid latitude, row #${i}`);
        }

        for (let i = 0; i < dateList.length; i++) {
            const date = dateList[i];
            const prevDate = dateList[i - 1];

            const cases = Number(casesRecord[date]);
            const deaths = Number(deathsRecord[date]);

            if (Number.isNaN(cases)) {
                throw new Error(`Invalid value in cases file, row #${i}, date ${date}`);
            }
            if (Number.isNaN(deaths)) {
                throw new Error(`Invalid value in deaths file, row #${i}, date ${date}`);
            }

            if (cases < 0) {
                casesRecord[date] = String(i > 0 ? Number(casesRecord[prevDate]) : 0);
            }
            if (deaths < 0) {
                deathsRecord[date] = String(i > 0 ? Number(deathsRecord[prevDate]) : 0);
            }
        }
    }

    fs.writeFileSync(path.join(dataPath, 'cases.csv'), stringify(cases, { header: true }));
    fs.writeFileSync(path.join(dataPath, 'deaths.csv'), stringify(deaths, { header: true }));
}
