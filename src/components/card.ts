import { Country, Region, Rows, Model, DeltaMode } from '../types';
import { calcDate, formatNumber, getCombinedRowName } from '../utils';
import { EventEmitter } from '../eventEmitter';
import dateLib from 'date-and-time';
import { App } from './app';

const width = 440;
const height = 300;

const padding = {
    top: 0,
    right: 0,
    bottom: 15,
    left: 0,
};

const chartTop = padding.top;
const chartBottom = height - padding.bottom;

const chartLeft = padding.left;
const chartRight = width - padding.right;

const crispEdges = 'shape-rendering="crispEdges"';
const captionFont =
    "font: 12px 'Roboto', Arial, Helvetica, sans-serif; font-weight: bold; opacity: 0.5";

export class Card extends EventEmitter {
    private subheader: HTMLDivElement;
    private header: HTMLDivElement;
    private chart: HTMLDivElement;

    private casesCount: HTMLDivElement;
    private deathsCount: HTMLDivElement;
    private casesCaption: HTMLDivElement;
    private deathsCaption: HTMLDivElement;

    private day: number;
    private rows: Rows;

    private deltaMode: DeltaMode;

    private dayCount: number;

    private country?: Country;
    private region?: Region;

    private app: App;
    private model: Model;

    private isDraggingOnChart: boolean;

    constructor(container: HTMLDivElement, app: App, model: Model) {
        super();

        const header = container.querySelector('.card-header') as HTMLDivElement;
        const subheader = container.querySelector('.card-subheader') as HTMLDivElement;
        const chart = container.querySelector('.chart') as HTMLDivElement;
        const closeButton = container.querySelector('.close-button') as HTMLDivElement;

        const casesCount = container.querySelector(
            '.chart-counter.cases .chart-counter-number',
        ) as HTMLDivElement;
        const deathsCount = container.querySelector(
            '.chart-counter.deaths .chart-counter-number',
        ) as HTMLDivElement;

        const casesCaption = container.querySelector(
            '.chart-counter.cases .chart-counter-caption',
        ) as HTMLDivElement;
        const deathsCaption = container.querySelector(
            '.chart-counter.deaths .chart-counter-caption',
        ) as HTMLDivElement;

        subheader.addEventListener('click', () => {
            this.fire('countryclick', this.country?.id);
        });

        closeButton.addEventListener('click', () => {
            this.fire('close');
        });

        this.subheader = subheader;
        this.header = header;
        this.chart = chart;
        this.model = model;
        this.app = app;

        this.dayCount = 0;

        this.day = this.model.dayCount - 1;
        this.rows = model.rows;
        this.deltaMode = 'daily';

        this.casesCount = casesCount;
        this.deathsCount = deathsCount;
        this.casesCaption = casesCaption;
        this.deathsCaption = deathsCaption;

        this.isDraggingOnChart = false;

        this.renderWorld();
    }

    public render(country: Country, region?: Region): void {
        this.country = country;
        this.region = region;

        const title = region !== undefined && region.name !== '' ? region.name : country.name;
        const subtitle = region !== undefined && region.name !== '' ? country.name : '';
        const rows = region !== undefined ? region.rows : country.rows;

        this.header.innerText = title;
        this.subheader.innerText = subtitle;
        this.chart.innerHTML = this.getChartMarkup(rows);

        this.rows = rows;
        this.setDay(this.day);
        this.bindEvents();
    }

    public renderWorld(): void {
        this.country = undefined;
        this.region = undefined;

        this.header.innerText = 'World';
        this.subheader.innerText = '';
        this.chart.innerHTML = this.getChartMarkup(this.model.rows);

        this.rows = this.model.rows;
        this.setDay(this.day);
        this.bindEvents();
    }

    public setDay(day: number): void {
        const casesRowName = getCombinedRowName('cases', this.deltaMode);
        const deathsRowName = getCombinedRowName('deaths', this.deltaMode);

        const cases = this.rows[casesRowName][Math.floor(day)];
        const deaths = this.rows[deathsRowName][Math.floor(day)];

        this.casesCount.innerText = formatNumber(cases, this.deltaMode);
        this.deathsCount.innerText = formatNumber(deaths, this.deltaMode);

        this.casesCaption.innerText = cases === 1 ? 'case' : 'cases';
        this.deathsCaption.innerText = deaths === 1 ? 'death' : 'deaths';

        const runner = this.chart.querySelector('.runner') as SVGLineElement;

        const offset = this.model.dayCount - this.dayCount;
        const barWidth = (chartRight - chartLeft) / this.dayCount;

        const x = chartLeft + barWidth * Math.floor(day - offset);
        runner.setAttribute('x', String(x));

        this.day = day;
    }

    public setDeltaMode(mode: DeltaMode): void {
        this.deltaMode = mode;

        if (this.country !== undefined) {
            this.render(this.country, this.region);
        } else {
            this.renderWorld();
        }
    }

    private getChartMarkup(rows: Rows): string {
        const casesRowName = getCombinedRowName('cases', this.deltaMode);
        const deathsRowName = getCombinedRowName('deaths', this.deltaMode);

        const maxValue = Math.max(...rows[casesRowName], ...rows[deathsRowName]);
        const heightMultiplier = (chartBottom - chartTop) / maxValue;

        let offset = 0;
        while (
            rows[casesRowName][offset] * heightMultiplier < 1 &&
            rows[deathsRowName][offset] * heightMultiplier < 1
        ) {
            offset++;
        }

        const dayCount = this.model.dayCount - offset;
        const barWidth = (chartRight - chartLeft) / dayCount;
        const captionCount = Math.min(dayCount, 3);

        this.dayCount = dayCount;

        let svg = '';

        // Main rectangles
        for (let i = 0; i < dayCount; i++) {
            const casesHeight = rows[casesRowName][offset + i] * heightMultiplier;
            const deathsHeight = rows[deathsRowName][offset + i] * heightMultiplier;
            const activeHeight = casesHeight - deathsHeight;

            const x = chartLeft + barWidth * i;

            if (deathsHeight > 0) {
                const y = chartBottom - deathsHeight;
                svg += this.rect(x, y, barWidth, deathsHeight, '#a50026');
            }

            if (activeHeight > 0) {
                const y = chartBottom - deathsHeight - activeHeight;
                svg += this.rect(x, y, barWidth, activeHeight, '#1a9850');
            }
        }

        // Bottom captions
        const captionStep = Math.ceil(dayCount / captionCount);
        for (let day = 0; day < dayCount - captionStep / 2; day += captionStep) {
            const x = day === 0 ? chartLeft : chartLeft + barWidth * (day + 0.5);

            const textStyle =
                day === 0
                    ? `${captionFont}; text-anchor: start;`
                    : `${captionFont}; text-anchor: middle;`;

            svg += this.text(this.formatDay(offset + day), x, height, textStyle);
        }
        svg += this.text(
            this.formatDay(offset + dayCount - 1),
            chartRight,
            height,
            `${captionFont}; text-anchor: end;`,
        );

        // Current date indicator
        svg += this.rect(0, chartTop, barWidth, chartBottom, 'rgba(0, 0, 0, 0.1)', 'runner');

        svg += this.rect(
            chartLeft,
            chartTop,
            chartRight - chartLeft,
            chartBottom - chartTop,
            'transparent',
            'chart-overlay',
        );

        return `
            <svg class="chart-svg" width="100%" height="100%" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
                ${svg}
            </svg>
        `;
    }

    private rect(
        x: number,
        y: number,
        width: number,
        height: number,
        fill: string,
        className?: string,
    ): string {
        const classString = className !== undefined ? `class="${className}"` : '';
        return `<rect ${crispEdges} fill="${fill}" x="${x}" y="${y}" width="${width}" height="${height}" ${classString} />`;
    }

    private text(text: string, x: number, y: number, style: string): string {
        return `<text style="${style}" x="${x}" y="${y}">${text}</text>`;
    }

    private formatDay(day: number): string {
        return dateLib.format(calcDate(day), 'DD.MM');
    }

    private bindEvents(): void {
        const svg = this.chart.querySelector('.chart-svg') as SVGElement;
        const overlay = this.chart.querySelector('.chart-overlay') as SVGRectElement;

        overlay.addEventListener('mousemove', (e) => {
            const barIndex = Math.floor((e.offsetX / svg.clientWidth) * this.dayCount);

            if (barIndex < 0 || barIndex > this.dayCount - 1) {
                return;
            }

            const day = this.model.dayCount - this.dayCount + barIndex;

            if (this.isDraggingOnChart) {
                this.app.setDay(day);
            } else {
                this.setDay(day);
            }
        });

        overlay.addEventListener('mouseleave', () => {
            this.isDraggingOnChart = false;
            this.setDay(this.app.getDay());
        });

        overlay.addEventListener('mousedown', () => {
            this.isDraggingOnChart = true;
        });

        overlay.addEventListener('mouseup', () => {
            this.isDraggingOnChart = false;
        });

        overlay.addEventListener('click', (e) => {
            const barIndex = Math.floor((e.offsetX / svg.clientWidth) * this.dayCount);

            if (barIndex < 0 || barIndex > this.dayCount - 1) {
                return;
            }

            const day = this.model.dayCount - this.dayCount + barIndex;

            this.app.setDay(day);
        });

        overlay.addEventListener('touchmove', (e) => {
            const barIndex = Math.floor((e.touches[0].clientX / svg.clientWidth) * this.dayCount);

            if (barIndex < 0 || barIndex > this.dayCount - 1) {
                return;
            }

            const day = this.model.dayCount - this.dayCount + barIndex;

            this.app.setDay(day);
        });
    }
}
