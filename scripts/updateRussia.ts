import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';
import { codes } from './codes';
import { dataPath } from './constants';
import * as parse from 'csv-parse/lib/sync';
import { ParsedCsv, Record } from './types';
import { formatDate, parseDate } from './utils';
import * as stringify from 'csv-stringify/lib/sync';

run();

async function run() {
    try {
        await update();
    } catch (e) {
        console.log(e);
        process.exit(-1);
    }
}

async function update(): Promise<void> {
    const casesText = fs.readFileSync(path.join(dataPath, 'russia', 'cases.csv'), 'utf8');
    const deathsText = fs.readFileSync(path.join(dataPath, 'russia', 'deaths.csv'), 'utf8');

    const cases = parse(casesText, { columns: true }) as ParsedCsv;
    const deaths = parse(deathsText, { columns: true }) as ParsedCsv;

    for (const region in codes) {
        const code = codes[region];

        const srcData: Record[] = await fetch(getUrl(code)).then((response) => response.json());
        const dstCases = cases.find((record) => record['Province_State'] === region) as Record;
        const dstDeaths = deaths.find((record) => record['Province_State'] === region) as Record;

        for (const srcRecord of srcData) {
            const dstDate = formatDate(parseDate(srcRecord.date, 'DD.MM.YYYY'), 'MM/DD/YY');

            dstCases[dstDate] = srcRecord.sick;
            dstDeaths[dstDate] = srcRecord.died;
        }

        await pause(250);
    }

    fs.writeFileSync(
        path.join(dataPath, 'russia', 'cases.csv'),
        stringify(cases, { header: true }),
    );
    fs.writeFileSync(
        path.join(dataPath, 'russia', 'deaths.csv'),
        stringify(deaths, { header: true }),
    );
}

function getUrl(code: string): string {
    return `https://xn--80aesfpebagmfblc0a.xn--p1ai/covid_data.json?do=region_stats&code=${code}`;
}

async function pause(delay: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, delay);
    });
}
