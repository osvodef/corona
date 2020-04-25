import { Model, RowName, Country, Region } from '../types';
import { throttle, clamp, formatNumber } from '../utils';
import { EventEmitter } from '../eventEmitter';

export class RegionList extends EventEmitter {
    private model: Model;
    private container: HTMLDivElement;

    private row: RowName;
    private day: number;

    private expandedCountries: Set<number>;

    private throttledRerender: () => void;

    constructor(container: HTMLDivElement, model: Model) {
        super();

        this.model = model;
        this.container = container;

        this.expandedCountries = new Set();

        container.addEventListener('click', (e) => {
            const target = e.target as HTMLDivElement;

            if (target.className === 'region') {
                this.fire('click', Number(target.dataset.id));
            }
        });

        this.throttledRerender = throttle(this.rerender, 500);

        this.row = 'cases';
        this.day = model.dayCount - 1;

        this.rerender();
    }

    public setDay(day: number): void {
        this.day = clamp(day, 0, this.model.dayCount - 1);

        this.throttledRerender();
    }

    public setRow(row: RowName): void {
        this.row = row;
        this.container.classList.remove('row-cases');
        this.container.classList.remove('row-deaths');
        this.container.classList.add(`row-${row}`);

        this.throttledRerender();
    }

    private rerender = () => {
        let html = '';

        html += this.getWorldMarkup();

        const day = Math.floor(this.day);
        const countries = this.model.countries
            .slice()
            .sort((a, b) => b.rows[this.row][day] - a.rows[this.row][day]);

        for (const country of countries) {
            html += this.getCountryMarkup(country);
        }

        this.container.innerHTML = html;

        this.bindEvents();
    };

    private getWorldMarkup(): string {
        const day = Math.floor(this.day);
        const caseCount = this.model.rows[this.row][day];

        return `
            <div class="country" data-id="world">
                <div class="country-info" data-id="world">
                    <div class="expand-button hidden"></div>
                    <div class="country-name">World</div>
                    <div class="country-case-count">${formatNumber(caseCount)}</div>
                </div>
            </div>
        `;
    }

    private getCountryMarkup(country: Country): string {
        const day = Math.floor(this.day);
        const caseCount = country.rows[this.row][day];
        const isExpanded = this.expandedCountries.has(country.id);
        const hasRegions = country.regions.length > 1;

        if (caseCount === 0) {
            return '';
        }

        let regionsMarkup = '';

        if (hasRegions) {
            const regions = country.regions
                .slice()
                .sort((a, b) => b.rows[this.row][day] - a.rows[this.row][day]);

            for (const region of regions) {
                regionsMarkup += this.getRegionMarkup(country, region);
            }
        }

        if (regionsMarkup.length > 0) {
            regionsMarkup = `<div class="country-regions" data-id="${country.id}">${regionsMarkup}</div>`;
        }

        const hidden = hasRegions ? '' : 'hidden';
        const expanded = isExpanded ? 'expanded' : '';

        return `
            <div class="country ${expanded}" data-id="${country.id}">
                <div class="country-info" data-id="${country.id}">
                    <div class="expand-button ${hidden}">
                        <img src="chevron.svg" class="icon expand" />
                        <img src="chevron-black.svg" class="icon expand-hover" />
                    </div>

                    <div class="country-name">${country.name}</div>
                    <div class="country-case-count">${formatNumber(caseCount)}</div>
                </div>
                ${regionsMarkup}
            </div>
        `;
    }

    private getRegionMarkup(country: Country, region: Region): string {
        const caseCount = region.rows[this.row][Math.floor(this.day)];

        if (caseCount === 0) {
            return '';
        }

        return `
            <div class="region" data-country="${country.id}" data-region="${region.id}">
                <div class="region-name">${region.name || country.name}</div>
                <div class="region-case-count">${formatNumber(caseCount)}</div>
            </div>
        `;
    }

    private toggleExpandCountry(country: number): void {
        const countryElement = this.container.querySelector(`.country[data-id="${country}"]`);

        if (!this.expandedCountries.has(country)) {
            this.expandedCountries.add(country);
            countryElement?.classList.add('expanded');
        } else {
            this.expandedCountries.delete(country);
            countryElement?.classList.remove('expanded');
        }
    }

    private bindEvents(): void {
        this.container.querySelectorAll('.country-info').forEach((element) => {
            element.addEventListener('click', (e) => {
                const target = e.target as HTMLDivElement;
                const id = (element as HTMLDivElement).dataset.id;

                if (id === 'world') {
                    this.fire('worldclick');
                    return;
                }

                const country = Number(id);

                if (target.classList.contains('expand-button')) {
                    this.toggleExpandCountry(country);
                    e.stopPropagation();
                    return;
                }

                this.fire('countryclick', country);
            });
        });

        this.container.querySelectorAll('.region').forEach((element) => {
            element.addEventListener('click', () => {
                const country = Number((element as HTMLDivElement).dataset.country);
                const region = Number((element as HTMLDivElement).dataset.region);

                this.fire('regionclick', country, region);
            });
        });
    }
}
