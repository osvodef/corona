import * as dateLib from 'date-and-time';
import * as parse from 'csv-parse/lib/sync';
import 'date-and-time/plugin/two-digit-year';

dateLib.plugin('two-digit-year');

export function getDayCount(text: string): number {
    return (parse(text)[0] as string[]).filter((header) => isDate(header)).length;
}

export function getDateList(dayOne: Date, dayCount: number, format: string): string[] {
    const strings: string[] = [];
    const date = new Date(dayOne);

    for (let i = 0; i < dayCount; i++) {
        strings.push(formatDate(date, format));
        date.setDate(date.getDate() + 1);
    }

    return strings;
}

export function isDate(key: string): boolean {
    return dateLib.isValid(key, 'M/D/YY') || dateLib.isValid(key, 'MM/DD/YY');
}

export function parseDate(string: string, format: string): Date {
    return dateLib.parse(string, format);
}

export function formatDate(date: Date, format: string): string {
    return dateLib.format(date, format);
}

export function equalArrays(arr1: string[], arr2: string[]): boolean {
    if (arr1.length !== arr2.length) {
        return false;
    }

    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) {
            return false;
        }
    }

    return true;
}
