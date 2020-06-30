import * as path from 'path';

export const baseUrl =
    'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series';

export const dataPath = path.join(__dirname, '..', 'assets', 'data');

export const usedColumns = ['Country/Region', 'Province/State', 'Lat', 'Long'];
