import { ParsedCsv, Record, RussiaRecord } from './types';
import * as stringify from 'csv-stringify/lib/sync';
import { getDayCount, getDateList } from './utils';
import { russiaPoints } from './russiaPoints';
import * as parse from 'csv-parse/lib/sync';
import { dayOne } from '../src/constants';
import * as path from 'path';
import * as fs from 'fs';

const dataPath = path.join(__dirname, '..', 'assets', 'data');

const casesText = fs.readFileSync(path.join(dataPath, 'cases.csv'), 'utf8');
const deathsText = fs.readFileSync(path.join(dataPath, 'deaths.csv'), 'utf8');
const russiaText = fs.readFileSync(path.join(dataPath, 'russia.json'), 'utf8');

let cases = parse(casesText, { columns: true }) as ParsedCsv;
let deaths = parse(deathsText, { columns: true }) as ParsedCsv;

cases = cases.filter((entry) => entry['Country/Region'] !== 'Russia');
deaths = deaths.filter((entry) => entry['Country/Region'] !== 'Russia');

const dayCount = getDayCount(parse(casesText)[0] as string[]);
const dateList = getDateList(dayOne, dayCount);

const russia: RussiaRecord[] = JSON.parse(russiaText).data;

for (const region of russia) {
    const { name } = region;
    const point = russiaPoints[name];

    const entry: Record = {
        'Country/Region': 'Russia',
        'Province/State': name,
        Long: String(point[0]),
        Lat: String(point[1]),
    };

    let totalCases = 0;
    let totalDeaths = 0;

    const casesEntry = Object.create(entry);
    const deathsEntry = Object.create(entry);

    for (let i = 0; i < dateList.length; i++) {
        const date = dateList[i];

        totalCases += i < 40 ? 0 : region.confirmed[i - 40];
        totalDeaths += i < 40 ? 0 : region.dead[i - 40];

        casesEntry[date] = totalCases;
        deathsEntry[date] = totalDeaths;
    }

    cases.push(casesEntry);
    deaths.push(deathsEntry);
}

fs.writeFileSync(path.join(dataPath, 'cases.csv'), stringify(cases, { header: true }));
fs.writeFileSync(path.join(dataPath, 'deaths.csv'), stringify(deaths, { header: true }));
