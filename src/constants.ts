import { LngLatBoundsLike } from 'mapbox-gl';

export const dayOne = new Date(2020, 0, 22);
export const dateFormat = 'M/D/YY';

export const mapStyle = 'mapbox://styles/mapbox/dark-v10';
export const mapAttribution =
    '<a target="_blank" href="https://alex.gl/">Alex Fedosov</a> | <a target="_blank" href="https://github.com/CSSEGISandData/COVID-19">JHU CSSE</a> | <a target="_blank" href="https://www.rospotrebnadzor.ru/region/korono_virus/epid.php">Rospotrebnadzor</a>';

export const initialPitch = 45;
export const initialBearing = 0;
export const initialBounds: LngLatBoundsLike = [
    [-153, -52],
    [175, 74],
];

export const columnFaceCount = 4;
export const columnHeightTotal = 0.003;
export const columnHeightDelta = 0.005;
export const columnWidth = 0.0015;
export const columnRotation = (30 / 180) * Math.PI;
export const animationSpeed = 25;

export const palette = [
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
