import mapbox from 'mapbox-gl';
import { isMobile, isNarrowScreen } from './utils';
import { buildModel } from './model';
import { App } from './components/app';
import { mapAttribution, initialBounds, initialBearing, initialPitch, mapStyle } from './constants';

if (isMobile) {
    document.body.classList.add('mobile');
}

const map = new mapbox.Map({
    accessToken:
        'pk.eyJ1Ijoib3N2b2RlZiIsImEiOiJjazNwbjNlMWUwNGtkM2Vtb253MjM3cXhvIn0.A9Qebgu0gf2BlndYixeeOw',
    container: document.querySelector('.map') as HTMLDivElement,
    style: mapStyle,
    customAttribution: mapAttribution,
    bearing: initialBearing,
    pitch: initialPitch,
    bounds: initialBounds,
    fitBoundsOptions: {
        padding: {
            top: 0,
            right: 0,
            bottom: 0,
            left: !isNarrowScreen() ? 480 : 0,
        },
    },
    logoPosition: 'top-right',
    renderWorldCopies: false,
});

Promise.all([
    fetch('data/cases.csv').then((response) => response.text()),
    fetch('data/deaths.csv').then((response) => response.text()),
]).then((results) => {
    const model = buildModel(results[0], results[1]);

    new App(document.body, map, model);
});
