import { RGB, Palette, RGBA, RowName } from './types';
import { worldSize, columnHeight, deathsPalette, dayOne, casesPalette } from './constants';

export const isMobile =
    typeof orientation !== 'undefined' || navigator.userAgent.toLowerCase().indexOf('mobile') >= 0;

export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

export function degToRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
}

export function radToDeg(radians: number): number {
    return (radians / Math.PI) * 180;
}

export function projectGeoToMap(geoPoint: number[]): number[] {
    const sin = Math.sin(degToRad(geoPoint[1]));

    const x = (geoPoint[0] * worldSize) / 360;
    const y = (Math.log((1 + sin) / (1 - sin)) * worldSize) / (4 * Math.PI);

    return [x, y, 0];
}

export function projectMapToGeo(mapPoint: number[]): number[] {
    const latFactor = (-2 * Math.PI) / worldSize;

    return [
        (mapPoint[0] * 360) / worldSize,
        90.0 - 2 * radToDeg(Math.atan(Math.exp(mapPoint[1] * latFactor))),
    ];
}

export function formatNumber(x: number): string {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function isNarrowScreen(): boolean {
    return document.body.clientWidth <= 800;
}

function lerpColors(color1: RGB, color2: RGB, ratio: number): RGB {
    return [
        Math.round(color1[0] * (1 - ratio) + color2[0] * ratio),
        Math.round(color1[1] * (1 - ratio) + color2[1] * ratio),
        Math.round(color1[2] * (1 - ratio) + color2[2] * ratio),
    ];
}

export function lerpArrayValues(array: number[], fractionalIndex: number): number {
    const leftIndex = Math.floor(fractionalIndex);
    const rightIndex = Math.min(leftIndex + 1, array.length - 1);

    const ratio = fractionalIndex % 1;

    return (1 - ratio) * array[leftIndex] + ratio * array[rightIndex];
}

export function calcDate(day: number): Date {
    return new Date(dayOne.getFullYear(), dayOne.getMonth(), dayOne.getDate() + Math.floor(day));
}

export function calcColumnHeight(value: number): number {
    return Math.max(Math.log(value), 0) * columnHeight;
}

export function calcColumnColor(
    row: RowName,
    value: number,
    maxValue: number,
    selectionMode: boolean,
    isSelected: boolean,
): RGBA {
    const numerator = Math.max(Math.log(value), 0);
    const denominator = Math.max(Math.log(maxValue), 0);

    const rgb = getColorFromPalette(
        row === 'cases' ? casesPalette : deathsPalette,
        numerator / denominator,
    );

    let opacity: number;

    if (!selectionMode) {
        opacity = 0.75;
    } else if (isSelected) {
        opacity = 1;
    } else {
        opacity = 0.25;
    }

    return [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, opacity];
}

function getColorFromPalette(palette: Palette, value: number): RGB {
    if (value <= 0) {
        return hexToRgb(palette[0]);
    }

    if (value >= 1) {
        return hexToRgb(palette[palette.length - 1]);
    }

    const leftColorIndex = Math.floor((palette.length - 1) * value);
    const ratio = ((palette.length - 1) * value) % 1;

    return lerpColors(
        hexToRgb(palette[leftColorIndex]),
        hexToRgb(palette[leftColorIndex + 1]),
        ratio,
    );
}

function hexToRgb(hex: string): RGB {
    return [
        parseInt(hex.slice(1, 3), 16),
        parseInt(hex.slice(3, 5), 16),
        parseInt(hex.slice(5, 7), 16),
    ];
}

export function throttle(fn: (...args: any[]) => void, time: number) {
    let lock: any;
    let savedArgs: any;

    function later() {
        // reset lock and call if queued
        lock = false;
        if (savedArgs) {
            wrapperFn(...savedArgs);
            savedArgs = false;
        }
    }

    function wrapperFn(...args: any[]) {
        if (lock) {
            // called too soon, queue to call later
            savedArgs = args;
        } else {
            // call and lock until later
            fn(...args);
            setTimeout(later, time);
            lock = true;
        }
    }

    return wrapperFn;
}

export function debounce(func: (...args: any[]) => void, wait: number, immediate?: boolean) {
    let timeout: any;
    let savedArgs: any;
    let timestamp: any;
    let result: any;

    const later = function() {
        const last = Date.now() - timestamp;

        if (last < wait && last >= 0) {
            timeout = setTimeout(later, wait - last);
        } else {
            timeout = null;
            if (!immediate) {
                result = func(...savedArgs);
                if (!timeout) {
                    savedArgs = null;
                }
            }
        }
    };

    return function(...args: any[]) {
        savedArgs = args;
        timestamp = Date.now();
        const callNow = immediate && !timeout;

        if (!timeout) {
            timeout = setTimeout(later, wait);
        }

        if (callNow) {
            result = func(...savedArgs);
            savedArgs = null;
        }

        return result;
    };
}
