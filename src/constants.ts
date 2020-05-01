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
    '#000004',
    '#36106b',
    '#792282',
    '#b3367a',
    '#e34e65',
    '#f9785d',
    '#fea16e',
    '#fec68a',
    '#fde3a5',
    '#fcfdbf',
];

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
