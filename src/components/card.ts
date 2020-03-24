import { Country, Region, Rows, Model } from '../types';
import { calcDate, formatNumber } from '../utils';
import { EventEmitter } from '../eventEmitter';
import dateLib from 'date-and-time';

const width = 460;
const height = 300;

const padding = {
    top: 5,
    right: 35,
    bottom: 15,
    left: 15,
};

const chartTop = padding.top;
const chartBottom = height - padding.bottom;

const chartLeft = padding.left;
const chartRight = width - padding.right;

const crispEdges = 'shape-rendering="crispEdges"';
const tickFont = 'font: 10px sans-serif;';

export class Card extends EventEmitter {
    private subheader: HTMLDivElement;
    private header: HTMLDivElement;
    private chart: HTMLDivElement;

    private casesCount: HTMLDivElement;
    private deathsCount: HTMLDivElement;

    private day: number;
    private rows: Rows;

    private dayCount: number;

    private model: Model;

    constructor(container: HTMLDivElement, model: Model) {
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

        closeButton.addEventListener('click', () => {
            this.fire('close');
        });

        this.subheader = subheader;
        this.header = header;
        this.chart = chart;
        this.model = model;

        this.dayCount = 0;

        this.day = this.model.dayCount - 1;
        this.rows = model.rows;

        this.casesCount = casesCount;
        this.deathsCount = deathsCount;

        this.renderWorld();
    }

    public render(country: Country, region?: Region): void {
        const title = region !== undefined && region.name !== '' ? region.name : country.name;
        const subtitle = region !== undefined && region.name !== '' ? country.name : '';
        const rows = region !== undefined ? region.rows : country.rows;

        this.header.innerText = title;
        this.subheader.innerText = subtitle;
        this.chart.innerHTML = this.getChartMarkup(rows);

        this.rows = rows;
        this.setDay(this.day);
    }

    public renderWorld(): void {
        this.header.innerText = 'World';
        this.subheader.innerText = '';
        this.chart.innerHTML = this.getChartMarkup(this.model.rows);

        this.rows = this.model.rows;
        this.setDay(this.day);
    }

    public setDay(day: number): void {
        this.casesCount.innerText = formatNumber(this.rows.cases[Math.floor(day)]);
        this.deathsCount.innerText = formatNumber(this.rows.deaths[Math.floor(day)]);

        const runner = this.chart.querySelector('.runner') as SVGLineElement;

        const offset = this.model.dayCount - this.dayCount;
        const barWidth = (chartRight - chartLeft) / this.dayCount;

        const inBound = day - offset >= 0 && day - offset < this.dayCount - 1;
        if (inBound) {
            runner.style.visibility = 'visible';
        } else {
            runner.style.visibility = 'hidden';
        }

        const x = chartLeft + barWidth * Math.max(day - offset, 0);
        runner.setAttribute('x1', String(x));
        runner.setAttribute('x2', String(x));

        this.day = day;
    }

    private getChartMarkup(rows: Rows): string {
        let offset = 0;
        while (rows.cases[offset] === 0 && rows.deaths[offset] === 0) {
            offset++;
        }
        offset = Math.max(offset - 1, 0);

        const dayCount = this.model.dayCount - offset;
        const maxValue = Math.max(...rows.cases, ...rows.deaths);
        const barWidth = (chartRight - chartLeft) / dayCount;
        const heightMultiplier = (chartBottom - chartTop) / maxValue;

        const horizontalTickCount = Math.min(dayCount, 5);
        const verticalTickCount = 10;
        const tickSize = 5;

        this.dayCount = dayCount;

        let rects = '';

        for (let i = 0; i < dayCount; i++) {
            const casesHeight = rows.cases[offset + i] * heightMultiplier;
            const deathsHeight = rows.deaths[offset + i] * heightMultiplier;
            const activeHeight = casesHeight - deathsHeight;

            const x = chartLeft + barWidth * i;

            if (deathsHeight > 0) {
                const y = chartBottom - deathsHeight;
                rects += this.rect(x, y, barWidth, deathsHeight, '#b2182b');
            }

            if (activeHeight > 0) {
                const y = chartBottom - deathsHeight - activeHeight;
                rects += this.rect(x, y, barWidth, activeHeight, '#4393c3');
            }
        }

        let axes = '';

        // Рисуем горизонтальную и вертикальную оси
        axes += this.line(chartLeft, chartBottom, chartRight, chartBottom);
        axes += this.line(chartRight, chartTop, chartRight, chartBottom);

        // Рисуем линию-индикатор текущей даты
        axes += this.line(0, chartTop, 0, chartBottom, 'runner');

        // Рисуем горизонтальные отметки и подписи к ним
        const horizontalStep = Math.ceil(dayCount / horizontalTickCount);
        const textStyle = `${tickFont}; text-anchor: middle;`;
        for (let day = 0; day < dayCount; day += horizontalStep) {
            const x = chartLeft + barWidth * day;

            axes += this.line(x, chartBottom, x, chartBottom + tickSize);
            axes += this.text(this.formatDay(offset + day), x, height, textStyle);
        }
        axes += this.line(chartRight, chartBottom, chartRight, chartBottom + tickSize);

        // Рисуем вертикальные отметки и подписи к ним
        const verticalStep = Math.max(10 ** Math.ceil(Math.log10(maxValue / verticalTickCount)), 1);

        for (let value = 0; value <= maxValue; value += verticalStep) {
            const y = chartBottom - value * heightMultiplier;

            axes += this.line(chartRight, y, chartRight + tickSize, y);
            axes += this.text(this.formatValue(value), chartRight + 10, y + 4, tickFont);
        }
        axes += this.line(chartRight, chartTop, chartRight + tickSize, chartTop);

        return `
            <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
                ${rects}
                ${axes}
            </svg>
        `;
    }

    private rect(x: number, y: number, width: number, height: number, fill: string): string {
        return `<rect ${crispEdges} fill="${fill}" x="${x}" y="${y}" width="${width}" height="${height}" />`;
    }

    private line(x1: number, y1: number, x2: number, y2: number, className?: string): string {
        return `<line ${crispEdges} x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#000" class="${className}"/>`;
    }

    private text(text: string, x: number, y: number, style: string): string {
        return `<text style="${style}" x="${x}" y="${y}">${text}</text>`;
    }

    private formatValue(value: number): string {
        if (value >= 1000000) {
            return `${value / 1000000}m`;
        }

        if (value >= 1000) {
            return `${value / 1000}k`;
        }

        return String(value);
    }

    private formatDay(day: number): string {
        return dateLib.format(calcDate(day), 'DD.MM');
    }
}
