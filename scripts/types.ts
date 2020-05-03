export interface Record {
    [key: string]: string;
}
export type ParsedCsv = Record[];

export type RussiaRecord = {
    name: string;
    confirmed: number[];
    dead: number[];
};

export type RussiaData = {
    startDate: string;
    data: RussiaRecord[];
};
