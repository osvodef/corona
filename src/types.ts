export type RGB = [number, number, number];
export type RGBA = [number, number, number, number];
export type Palette = string[];

export type RowName = 'cases' | 'deaths';
export type DeltaMode = 'daily' | 'total';
export type CombinedRowName = 'casesTotal' | 'deathsTotal' | 'casesDaily' | 'deathsDaily';

export type ModeName = 'map' | 'list' | 'card';

export interface Model {
    dayCount: number;
    maxValues: { [key in CombinedRowName]: number };
    rows: Rows;
    countries: Country[];
}

export interface Country {
    id: number;
    name: string;
    rows: Rows;
    regions: Region[];
}

export interface Region {
    id: number;
    country: Country;
    name: string;
    lng: number;
    lat: number;
    rows: Rows;
}

export type Rows = { [key in CombinedRowName]: number[] };
