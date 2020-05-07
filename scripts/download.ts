import { baseUrl, dataPath } from './constants';
import fetch from 'node-fetch';
import * as path from 'path';
import * as fs from 'fs';

const confirmedUrl = `${baseUrl}/time_series_covid19_confirmed_global.csv`;
const deathsUrl = `${baseUrl}/time_series_covid19_deaths_global.csv`;

async function run(): Promise<void> {
    fs.writeFileSync(
        path.join(dataPath, 'cases.csv'),
        await fetch(confirmedUrl).then((response) => response.text()),
    );
    fs.writeFileSync(
        path.join(dataPath, 'deaths.csv'),
        await fetch(deathsUrl).then((response) => response.text()),
    );
}

run();
