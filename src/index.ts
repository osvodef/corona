import mapbox from 'mapbox-gl';
import { isMobile, isNarrowScreen } from './utils';
import { buildModel } from './model';
import { App } from './components/app';
import {
    mapAttribution,
    initialBounds,
    initialBearing,
    initialPitch,
    mapStyle,
    casesUrl,
    deathsUrl,
} from './constants';

if (isSupported()) {
    init();
} else {
    (document.getElementById('no-webgl') as HTMLDivElement).style.display = 'table';
}

function init() {
    if (isMobile) {
        document.body.classList.add('mobile');
    }

    const map = new mapbox.Map({
        accessToken:
            'pk.eyJ1Ijoib3N2b2RlZiIsImEiOiJjbTdhN2Q2ZHAwMHk3MmtyMTJmcGt5ZHFzIn0.bTd3rnLXOlGUlegWDlBxcw',
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
        fetch(casesUrl).then((response) => response.text()),
        fetch(deathsUrl).then((response) => response.text()),
    ]).then((results) => {
        const model = buildModel(results[0], results[1]);

        new App(document.body, map, model);
    });
}

function isSupported(): boolean {
    try {
        return (
            'WebGLRenderingContext' in window &&
            !!document.createElement('canvas').getContext('webgl')
        );
    } catch (e) {
        return false;
    }
}
