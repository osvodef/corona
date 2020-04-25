import vertexShader from '../webgl/shaders/render.vert.glsl';
import fragmentShader from '../webgl/shaders/frag.glsl';

import { Picker } from '../webgl/picker';
import { Column } from '../webgl/column';
import { Model, RowName } from '../types';
import { Program } from '../webgl/program';
import { animationSpeed } from '../constants';
import { EventEmitter } from '../eventEmitter';
import {
    clamp,
    lerpArrayValues,
    calcColumnHeight,
    calcColumnColor,
    debounce,
    isMobile,
    formatNumber,
    getMvp,
} from '../utils';

export class Scope extends EventEmitter {
    private container: HTMLDivElement;
    private canvas: HTMLCanvasElement;

    private tooltip: HTMLDivElement;
    private tooltipHeader: HTMLDivElement;
    private tooltipSubheader: HTMLDivElement;
    private tooltipCaseCount: HTMLDivElement;
    private tooltipDeathsCount: HTMLDivElement;

    private gl: WebGLRenderingContext;
    private renderingProgram: Program;

    private picker: Picker;

    private map: mapboxgl.Map;

    private width: number;
    private height: number;

    private model: Model;
    private columns: Column[];

    private day: number;
    private row: RowName;

    private animationStartTime: number | undefined;
    private animationStartDayIndex: number | undefined;

    private selectedColumns: Set<string>;

    private debouncedShowTooltip: (x: number, y: number) => void;

    private needsRerender: boolean;

    constructor(
        container: HTMLDivElement,
        tooltip: HTMLDivElement,
        map: mapboxgl.Map,
        model: Model,
    ) {
        super();

        this.container = container;
        this.tooltip = tooltip;
        this.canvas = document.createElement('canvas');

        this.tooltipHeader = tooltip.querySelector('.tooltip-header') as HTMLDivElement;
        this.tooltipSubheader = tooltip.querySelector('.tooltip-subheader') as HTMLDivElement;
        this.tooltipCaseCount = tooltip.querySelector('.tooltip-counter.cases') as HTMLDivElement;
        this.tooltipDeathsCount = tooltip.querySelector(
            '.tooltip-counter.deaths',
        ) as HTMLDivElement;

        container.appendChild(this.canvas);

        window.addEventListener('resize', this.resetSize);

        const gl = this.canvas.getContext('webgl') as WebGLRenderingContext;

        gl.clearColor(0, 0, 0, 0);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.enable(gl.CULL_FACE);

        this.gl = gl;
        this.map = map;

        this.model = model;

        this.needsRerender = true;

        this.renderingProgram = new Program(
            gl,
            vertexShader,
            fragmentShader,
            ['position', 'normal'],
            [
                { name: 'mvp', type: '4m' },
                { name: 'color', type: '4f' },
                { name: 'height', type: '1f' },
            ],
        );

        this.row = 'cases';
        this.day = this.model.dayCount - 1;

        this.columns = [];
        this.initColumns(model);

        this.picker = new Picker(gl, this, map, this.columns);

        this.selectedColumns = new Set();

        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';

        this.width = 0;
        this.height = 0;

        this.resetSize();

        this.debouncedShowTooltip = debounce(this.showTooltip, 100);

        map.on('move', () => {
            this.needsRerender = true;
        });

        map.on('render', () => {
            this.render();
        });

        map.on('click', (e) => {
            this.fire('click', this.picker.pick(e.point.x, e.point.y));
        });

        map.on('mousemove', (e) => {
            if (!isMobile) {
                this.debouncedShowTooltip(e.point.x, e.point.y);

                if (this.picker.pick(e.point.x, e.point.y) === undefined) {
                    this.tooltip.style.display = 'none';
                }
            }
        });

        this.renderLoop();
    }

    public setRow(row: RowName): void {
        this.row = row;
        this.needsRerender = true;
        this.fire('rowchange');
    }

    public getRow(): RowName {
        return this.row;
    }

    public setDay(index: number): void {
        this.day = clamp(index, 0, this.model.dayCount - 1);
        this.needsRerender = true;
        this.fire('daychange');
    }

    public getDay(): number {
        return this.day;
    }

    public play(): void {
        if (this.day === this.model.dayCount - 1) {
            this.day = 0;
        }

        this.animationStartTime = Date.now();
        this.animationStartDayIndex = this.day;

        this.fire('play');
    }

    public pause(): void {
        this.animationStartTime = undefined;
        this.animationStartDayIndex = undefined;

        this.fire('pause');
    }

    public isPlaying(): boolean {
        return this.animationStartTime !== undefined && this.animationStartDayIndex !== undefined;
    }

    public selectCountry(id: number): void {
        this.deselect();

        const country = this.model.countries[id];

        for (const region of country.regions) {
            this.selectedColumns.add(`${country.id}_${region.id}`);
        }

        this.needsRerender = true;
    }

    public selectRegion(countryId: number, regionId: number): void {
        this.deselect();

        this.selectedColumns.add(`${countryId}_${regionId}`);

        this.needsRerender = true;
    }

    public deselect(): void {
        this.selectedColumns.clear();
        this.needsRerender = true;
    }

    private initColumns(model: Model): void {
        const { gl } = this;

        let columnId = 0;
        for (const country of model.countries) {
            for (const region of country.regions) {
                this.columns.push(new Column(gl, country, region, columnId++));
            }
        }
    }

    private resetSize = (): void => {
        const { canvas, container } = this;

        const width = container.clientWidth;
        const height = container.clientHeight;

        const scaledWidth = width * window.devicePixelRatio;
        const scaledHeight = height * window.devicePixelRatio;

        canvas.width = scaledWidth;
        canvas.height = scaledHeight;

        this.width = scaledWidth;
        this.height = scaledHeight;

        this.picker.setSize(width, height);
    };

    private showTooltip = (x: number, y: number): void => {
        const column = this.picker.pick(x, y);
        if (column === undefined) {
            this.tooltip.style.display = 'none';
            return;
        }

        this.tooltip.style.display = 'block';
        this.tooltip.style.transform = `translate(${x + 15}px, ${y + 15}px)`;

        const { region, country } = column;

        const title = region.name !== '' ? region.name : country.name;
        const subtitle = region.name !== '' ? country.name : '';

        const dayIndex = Math.floor(this.day);

        this.tooltipHeader.innerText = title;
        this.tooltipSubheader.innerText = subtitle;
        this.tooltipCaseCount.innerText = formatNumber(region.rows['cases'][dayIndex]);
        this.tooltipDeathsCount.innerText = formatNumber(region.rows['deaths'][dayIndex]);
    };

    private renderLoop = (): void => {
        requestAnimationFrame(this.renderLoop);

        this.updateAnimation();

        if (this.needsRerender) {
            this.map.triggerRepaint();
            this.picker.update();
            this.needsRerender = false;
        }
    };

    private updateAnimation(): void {
        if (!this.isPlaying()) {
            return;
        }

        // We know that these properties are not undefined since the animation is currently running
        const startTime = this.animationStartTime as number;
        const startDayIndex = this.animationStartDayIndex as number;

        const dayCount = this.model.dayCount;
        const elapsedTime = Date.now() - startTime;
        const newDayIndex = startDayIndex + (elapsedTime * animationSpeed) / 1000;

        if (newDayIndex < dayCount - 1) {
            this.setDay(newDayIndex);
        } else {
            this.setDay(dayCount - 1);
            this.pause();
        }
    }

    private render(): void {
        const { gl, columns } = this;

        this.renderingProgram.use();

        gl.viewport(0, 0, this.width, this.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        this.renderingProgram.bindUniform('mvp', ...getMvp(this.map));

        const maxValue = this.model.maxValues[this.row];
        const selectionMode = this.selectedColumns.size > 0;

        for (const column of columns) {
            const values = column.region.rows[this.row];
            const value = lerpArrayValues(values, this.day);

            if (value === 0) {
                continue;
            }

            const isSelected = this.selectedColumns.has(column.key);
            if (isSelected) {
                this.renderingProgram.bindUniform(
                    'color',
                    ...calcColumnColor(this.row, value, maxValue, selectionMode, isSelected),
                );
                this.renderingProgram.bindAttribute('position', column.positionBuffer);
                this.renderingProgram.bindAttribute('normal', column.normalBuffer);
                this.renderingProgram.bindUniform('height', calcColumnHeight(value));

                gl.drawArrays(gl.TRIANGLES, 0, column.vertexCount);
            }
        }

        for (const column of columns) {
            const values = column.region.rows[this.row];
            const value = lerpArrayValues(values, this.day);

            if (value === 0) {
                continue;
            }

            const isSelected = this.selectedColumns.has(column.key);
            if (!isSelected) {
                this.renderingProgram.bindUniform(
                    'color',
                    ...calcColumnColor(this.row, value, maxValue, selectionMode, isSelected),
                );
                this.renderingProgram.bindAttribute('position', column.positionBuffer);
                this.renderingProgram.bindAttribute('normal', column.normalBuffer);
                this.renderingProgram.bindUniform('height', calcColumnHeight(value));

                gl.drawArrays(gl.TRIANGLES, 0, column.vertexCount);
            }
        }
    }
}
