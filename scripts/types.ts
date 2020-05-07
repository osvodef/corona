export interface Record {
    [key: string]: string;
}
export type ParsedCsv = Record[];

export type RussianRecord = {
    name: string;
    confirmed: number[];
    dead: number[];
};

export type RussianData = {
    startDate: string;
    data: RussianRecord[];
};
