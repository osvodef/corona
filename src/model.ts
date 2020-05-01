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
        casesTotal: 0,
        deathsTotal: 0,
        casesDaily: 0,
        deathsDaily: 0,
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

        for (let dayIndex = 0; dayIndex < dates.length; dayIndex++) {
            const date = dates[dayIndex];
            const prevDate = dates[dayIndex - 1];

            const cases = Number(casesRecord[date]);
            const deaths = Number(deathsRecord[date]);

            const casesDelta =
                dayIndex !== 0
                    ? Math.max(Number(casesRecord[date]) - Number(casesRecord[prevDate]), 0)
                    : 0;

            const deathsDelta =
                dayIndex !== 0
                    ? Math.max(Number(deathsRecord[date]) - Number(deathsRecord[prevDate]), 0)
                    : 0;

            if (cases > maxValues.casesTotal) {
                maxValues.casesTotal = cases;
            }
            if (deaths > maxValues.deathsTotal) {
                maxValues.deathsTotal = deaths;
            }
            if (casesDelta > maxValues.casesDaily) {
                maxValues.casesDaily = casesDelta;
            }
            if (deathsDelta > maxValues.deathsDaily) {
                maxValues.deathsDaily = deathsDelta;
            }

            regionRows.casesTotal[dayIndex] += cases;
            regionRows.deathsTotal[dayIndex] += deaths;

            countryRows.casesTotal[dayIndex] += cases;
            countryRows.deathsTotal[dayIndex] += deaths;

            worldRows.casesTotal[dayIndex] += cases;
            worldRows.deathsTotal[dayIndex] += deaths;

            regionRows.casesDaily[dayIndex] += casesDelta;
            regionRows.deathsDaily[dayIndex] += deathsDelta;

            countryRows.casesDaily[dayIndex] += casesDelta;
            countryRows.deathsDaily[dayIndex] += deathsDelta;

            worldRows.casesDaily[dayIndex] += casesDelta;
            worldRows.deathsDaily[dayIndex] += deathsDelta;
        }
    }

    return model;
}

function createEmptyRows(dayCount: number): Rows {
    return {
        casesTotal: Array(dayCount).fill(0),
        deathsTotal: Array(dayCount).fill(0),
        casesDaily: Array(dayCount).fill(0),
        deathsDaily: Array(dayCount).fill(0),
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
