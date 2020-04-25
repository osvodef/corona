import { Model, Rows, Country } from './types';
import parse from 'csv-parse/lib/sync';
import dateLib from 'date-and-time';
import 'date-and-time/plugin/two-digit-year';
import { dateFormat, dayOne } from './constants';

dateLib.plugin('two-digit-year');

type ParsedCsv = ParsedRecord[];

interface ParsedRecord {
    [key: string]: string;
}

export function buildModel(casesCsv: string, deathsCsv: string): Model {
    const cases: ParsedCsv = parse(casesCsv, { columns: true });
    const deaths: ParsedCsv = parse(deathsCsv, { columns: true });

    const rowsByCountry: { [country: string]: Rows } = {};
    const rowsByRegion: { [region: string]: Rows } = {};

    const maxValues = {
        cases: 0,
        deaths: 0,
    };

    const countries = Array.from(new Set(cases.map((record) => record['Country/Region'])));
    const dayCount = Object.keys(cases[0]).filter((key) => dateLib.isValid(key, dateFormat)).length;
    const dates = getDateList(dayOne, dayCount);

    const model: Model = {
        dayCount,
        maxValues,
        rows: createEmptyRows(dayCount),
        countries: countries.map((countryName, id) => {
            const regions = cases.filter((record) => record['Country/Region'] === countryName);

            const rows = createEmptyRows(dayCount);
            rowsByCountry[countryName] = rows;

            const country: Country = {
                id,
                name: countryName,
                rows,
                regions: [],
            };

            country.regions = regions.map((region, id) => {
                const regionName = region['Province/State'];
                const lng = Number(region['Long']);
                const lat = Number(region['Lat']);
                const rows = createEmptyRows(dayCount);
                rowsByRegion[`${countryName}$${regionName}`] = rows;
                return { id, name: regionName, country, lng, lat, rows };
            });

            return country;
        }),
    };

    for (let i = 0; i < cases.length; i++) {
        const casesRecord = cases[i];
        const deathsRecord = deaths[i];

        const countryName = casesRecord['Country/Region'];
        const regionName = casesRecord['Province/State'];

        const regionRows = rowsByRegion[`${countryName}$${regionName}`];
        const countryRows = rowsByCountry[countryName];
        const worldRows = model.rows;

        let dayIndex = 0;
        for (const date of dates) {
            const cases = Number(casesRecord[date]);
            const deaths = Number(deathsRecord[date]);

            if (cases > maxValues.cases) {
                maxValues.cases = cases;
            }

            if (deaths > maxValues.deaths) {
                maxValues.deaths = deaths;
            }

            regionRows.cases[dayIndex] += cases;
            regionRows.deaths[dayIndex] += deaths;

            countryRows.cases[dayIndex] += cases;
            countryRows.deaths[dayIndex] += deaths;

            worldRows.cases[dayIndex] += cases;
            worldRows.deaths[dayIndex] += deaths;

            dayIndex++;
        }
    }

    return model;
}

function createEmptyRows(dayCount: number): Rows {
    return {
        cases: Array(dayCount).fill(0),
        deaths: Array(dayCount).fill(0),
    };
}

function getDateList(dayOne: Date, dayCount: number): string[] {
    const strings: string[] = [];
    const date = new Date(dayOne);

    for (let i = 0; i < dayCount; i++) {
        strings.push(dateLib.format(date, dateFormat));
        date.setDate(date.getDate() + 1);
    }

    return strings;
}
