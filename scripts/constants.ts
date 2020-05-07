import * as path from 'path';

export const baseUrl =
    'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series';
export const russianDataUrl =
    'https://raw.githubusercontent.com/mediazona/data-corona-Russia/master/data.json';

export const dataPath = path.join(__dirname, '..', 'assets', 'data');

export const russianDataOffset = 40;

export const usedColumns = ['Country/Region', 'Province/State', 'Lat', 'Long'];
