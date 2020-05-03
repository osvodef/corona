import fetch from 'node-fetch';
import * as path from 'path';
import * as fs from 'fs';

const baseUrl =
    'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series';

const confirmedUrl = `${baseUrl}/time_series_covid19_confirmed_global.csv`;
const deathsUrl = `${baseUrl}/time_series_covid19_deaths_global.csv`;
const russiaUrl = 'https://raw.githubusercontent.com/mediazona/data-corona-Russia/master/data.json';

const outPath = path.join(__dirname, '..', 'assets', 'data');

async function run(): Promise<void> {
    const casesText = await fetch(confirmedUrl).then((response) => response.text());
    const deathsText = await fetch(deathsUrl).then((response) => response.text());
    const russiaText = await fetch(russiaUrl).then((response) => response.text());

    fs.writeFileSync(path.join(outPath, 'cases.csv'), casesText);
    fs.writeFileSync(path.join(outPath, 'deaths.csv'), deathsText);
    fs.writeFileSync(path.join(outPath, 'russia.json'), russiaText);
}

run();
