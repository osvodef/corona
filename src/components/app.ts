import { Card } from './card';
import mapbox from 'mapbox-gl';
import { Scope } from './scope';
import dateLib from 'date-and-time';
import { RegionList } from './regionList';
import { initialBounds } from '../constants';
import { calcDate, isNarrowScreen } from '../utils';
import { Model, RowName, Region, Country, ModeName } from '../types';

export class App {
    private map: mapboxgl.Map;
    private model: Model;

    private sidebar: HTMLDivElement;

    private regionList: RegionList;
    private scope: Scope;
    private card: Card;

    private rowSelectorButtons: NodeListOf<HTMLDivElement>;
    private modeSelectorButtons: NodeListOf<HTMLDivElement>;

    private day: number;

    constructor(container: HTMLElement, map: mapboxgl.Map, model: Model) {
        this.map = map;
        this.model = model;

        const tooltip = container.querySelector('.tooltip') as HTMLDivElement;
        const sidebar = container.querySelector('.sidebar') as HTMLDivElement;
        const cardElement = container.querySelector('.card') as HTMLDivElement;
        const scopeElement = container.querySelector('.scope') as HTMLDivElement;
        const regionListElement = container.querySelector('.countries') as HTMLDivElement;
        const playButton = container.querySelector('.play-button') as HTMLDivElement;
        const playIcon = playButton.querySelector('.icon.play') as HTMLImageElement;
        const pauseIcon = playButton.querySelector('.icon.pause') as HTMLImageElement;
        const dateSlider = container.querySelector('.date-slider') as HTMLInputElement;
        const dateIndicator = container.querySelector('.date-indicator') as HTMLDivElement;
        const rowSelectorButtons = container.querySelectorAll('.row-selector-button') as NodeListOf<
            HTMLDivElement
        >;
        const modeSelectorButtons = container.querySelectorAll(
            '.mode-selector-button',
        ) as NodeListOf<HTMLDivElement>;

        const regionList = new RegionList(regionListElement, model);
        const scope = new Scope(scopeElement, tooltip, map, model);
        const card = new Card(cardElement, this, model);

        scope.on('daychange', () => {
            const day = scope.getDay();

            regionList.setDay(day);
            card.setDay(day);
            this.day = day;

            dateSlider.value = String(day);
            dateIndicator.innerText = dateLib.format(calcDate(day), 'DD.MM.YYYY');
        });

        scope.on('play', () => {
            playIcon.classList.add('hidden');
            pauseIcon.classList.remove('hidden');
        });

        scope.on('pause', () => {
            playIcon.classList.remove('hidden');
            pauseIcon.classList.add('hidden');
        });

        scope.on('click', (region: Region | undefined) => {
            if (region !== undefined) {
                this.setMode('card');
                this.card.render(region.country, region);
                scope.selectRegion(region.country.id, region.id);
            } else {
                this.setMode('map');
                scope.deselect();
            }
        });

        regionList.on('worldclick', () => {
            this.setMode('card');
            this.card.renderWorld();
            scope.deselect();
            this.focusOnWorld();
        });

        regionList.on('countryclick', (id: number) => {
            const country = this.model.countries[id];

            this.setMode('card');
            this.card.render(country);
            scope.selectCountry(id);
            this.focusOnCountry(country);
        });

        card.on('countryclick', (id: number | undefined) => {
            if (id !== undefined) {
                const country = this.model.countries[id];

                this.setMode('card');
                this.card.render(country);
                scope.selectCountry(id);
                this.focusOnCountry(country);
            }
        });

        regionList.on('regionclick', (countryId: number, regionId: number) => {
            const country = this.model.countries[countryId];
            const region = country.regions[regionId];

            this.setMode('card');
            this.card.render(country, region);
            scope.selectRegion(countryId, regionId);
            this.focusOnRegion(region);
        });

        card.on('close', () => {
            this.setMode('list');
            scope.deselect();
        });

        playButton.addEventListener('click', () => {
            if (this.scope.isPlaying()) {
                this.scope.pause();
            } else {
                this.scope.play();
            }
        });

        rowSelectorButtons.forEach((button) => {
            button.addEventListener('click', () => {
                this.setRow(button.dataset.row as RowName);
            });
        });

        modeSelectorButtons.forEach((button) => {
            button.addEventListener('click', () => {
                this.setMode(button.dataset.mode as ModeName);
            });
        });

        dateSlider.max = String(this.model.dayCount - 1);
        dateSlider.value = String(this.model.dayCount - 1);
        dateIndicator.innerText = dateLib.format(calcDate(scope.getDay()), 'DD.MM.YYYY');

        dateSlider.addEventListener('input', () => {
            const day = Number(dateSlider.value);

            scope.pause();
            scope.setDay(day);
            regionList.setDay(day);
            card.setDay(day);

            this.day = day;
        });

        this.day = this.model.dayCount - 1;

        this.scope = scope;
        this.regionList = regionList;
        this.sidebar = sidebar;
        this.card = card;

        this.rowSelectorButtons = rowSelectorButtons;
        this.modeSelectorButtons = modeSelectorButtons;
    }

    public getDay(): number {
        return this.day;
    }

    public setDay(day: number): void {
        this.scope.setDay(day);
        this.regionList.setDay(day);
        this.card.setDay(day);
    }

    private setMode(mode: ModeName): void {
        this.sidebar.classList.remove('mode-map');
        this.sidebar.classList.remove('mode-list');
        this.sidebar.classList.remove('mode-card');

        this.sidebar.classList.add(`mode-${mode}`);

        this.modeSelectorButtons.forEach((button) => {
            const buttonMode = button.dataset.mode as ModeName;

            if (mode === buttonMode) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }

    private setRow(row: RowName): void {
        this.scope.setRow(row);
        this.regionList.setRow(row);

        this.rowSelectorButtons.forEach((button) => {
            const buttonRow = button.dataset.row as RowName;

            if (row === buttonRow) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }

    private focusOnRegion(region: Region): void {
        this.map.easeTo({
            center: [region.lng, region.lat],
            zoom: 3,
            offset: !isNarrowScreen() ? [240, 100] : [0, 100],
            duration: 800,
        });
    }

    private focusOnCountry(country: Country): void {
        if (country.regions.length === 1) {
            this.focusOnRegion(country.regions[0]);
            return;
        }

        const mainRegion = country.regions.find((region) => region.name === '');
        if (mainRegion !== undefined) {
            this.focusOnRegion(mainRegion);
            return;
        }

        const bounds = new mapbox.LngLatBounds();
        for (const region of country.regions) {
            bounds.extend(new mapbox.LngLat(region.lng, region.lat));
        }
        this.map.fitBounds(bounds, {
            padding: { left: !isNarrowScreen() ? 580 : 100, top: 100, right: 100, bottom: 100 },
            duration: 800,
        });
    }

    private focusOnWorld(): void {
        this.map.fitBounds(initialBounds, {
            padding: { left: !isNarrowScreen() ? 480 : 0, top: 0, right: 0, bottom: 0 },
            duration: 800,
        });
    }
}
