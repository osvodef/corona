export function getDayCount(headers: string[]): number {
    return headers.filter((header) => isDate(header)).length;
}

export function getDateList(dayOne: Date, dayCount: number): string[] {
    const strings: string[] = [];
    const date = new Date(dayOne);

    for (let i = 0; i < dayCount; i++) {
        strings.push(format(date));
        date.setDate(date.getDate() + 1);
    }

    return strings;
}

export function isDate(key: string): boolean {
    return /^\d{1,2}\/\d{1,2}\/\d{2}$/g.test(key);
}

export function format(date: Date): string {
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear() % 100}`;
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
