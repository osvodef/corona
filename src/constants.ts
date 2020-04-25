import { LngLatBoundsLike } from 'mapbox-gl';

export const dayOne = new Date(2020, 0, 22);
export const dateFormat = 'M/D/YY';

export const mapStyle = 'mapbox://styles/mapbox/dark-v10';
export const mapAttribution =
    '<a href="https://alex.gl/">Alex Fedosov</a> | <a href="https://github.com/CSSEGISandData">JHU CSSE</a>';

export const initialPitch = 45;
export const initialBearing = 0;
export const initialBounds: LngLatBoundsLike = [
    [-153, -52],
    [175, 74],
];

export const columnFaceCount = 4;
export const columnHeight = 0.0047;
export const columnWidth = 0.002;
export const animationSpeed = 15;

export const casesPalette = [
    '#ffffd9',
    '#edf8b1',
    '#c7e9b4',
    '#7fcdbb',
    '#41b6c4',
    '#1d91c0',
    '#225ea8',
    '#253494',
    '#081d58',
].reverse();

export const deathsPalette = [
    '#fff5f0',
    '#fee0d2',
    '#fcbba1',
    '#fc9272',
    '#fb6a4a',
    '#ef3b2c',
    '#cb181d',
    '#a50f15',
    '#67000d',
].reverse();
