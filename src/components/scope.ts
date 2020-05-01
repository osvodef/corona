import vertexShader from '../webgl/shaders/render.vert.glsl';
import fragmentShader from '../webgl/shaders/frag.glsl';

import { Picker } from '../webgl/picker';
import { Column } from '../webgl/column';
import { Program } from '../webgl/program';
import { animationSpeed } from '../constants';
import { EventEmitter } from '../eventEmitter';
import { MercatorCoordinate } from 'mapbox-gl';
import { Model, RowName, Region, DeltaMode } from '../types';
import {
    clamp,
    lerpArrayValues,
    calcColumnHeight,
    calcColumnColor,
    debounce,
    isMobile,
    formatNumber,
    getMvp,
    getCombinedRowName,
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
    private column: Column;

    private day: number;
    private row: RowName;
    private deltaMode: DeltaMode;

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
                { name: 'center', type: '2f' },
            ],
        );

        this.row = 'cases';
        this.deltaMode = 'daily';
        this.day = this.model.dayCount - 1;

        this.column = new Column(gl);

        this.picker = new Picker(gl, this, map, this.model, this.column);

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

    public setDeltaMode(mode: DeltaMode): void {
        this.deltaMode = mode;
        this.needsRerender = true;
        this.fire('deltachange');
    }

    public getRow(): RowName {
        return this.row;
    }

    public getDeltaMode(): DeltaMode {
        return this.deltaMode;
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
        const region = this.picker.pick(x, y);
        if (region === undefined) {
            this.tooltip.style.display = 'none';
            return;
        }

        this.tooltip.style.display = 'block';
        this.tooltip.style.transform = `translate(${x + 15}px, ${y + 15}px)`;

        const { country } = region;

        const title = region.name !== '' ? region.name : country.name;
        const subtitle = region.name !== '' ? country.name : '';

        const dayIndex = Math.floor(this.day);

        this.tooltipHeader.innerText = title;
        this.tooltipSubheader.innerText = subtitle;

        const casesRowName = getCombinedRowName('cases', this.deltaMode);
        const deathsRowName = getCombinedRowName('deaths', this.deltaMode);
        this.tooltipCaseCount.innerText = formatNumber(
            region.rows[casesRowName][dayIndex],
            this.deltaMode,
        );
        this.tooltipDeathsCount.innerText = formatNumber(
            region.rows[deathsRowName][dayIndex],
            this.deltaMode,
        );
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
        const { gl, column } = this;
        const { positionBuffer, normalBuffer } = column;

        this.renderingProgram.use();

        gl.viewport(0, 0, this.width, this.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        this.renderingProgram.bindUniform('mvp', ...getMvp(this.map));
        this.renderingProgram.bindAttribute('position', positionBuffer);
        this.renderingProgram.bindAttribute('normal', normalBuffer);

        const combinedRowName = getCombinedRowName(this.row, this.deltaMode);

        const maxValue = this.model.maxValues[combinedRowName];
        const selectionMode = this.selectedColumns.size > 0;

        for (const country of this.model.countries) {
            for (const region of country.regions) {
                const isSelected = this.selectedColumns.has(`${country.id}_${region.id}`);

                if (isSelected) {
                    this.renderColumn(region, maxValue, selectionMode, isSelected);
                }
            }
        }

        for (const country of this.model.countries) {
            for (const region of country.regions) {
                const isSelected = this.selectedColumns.has(`${country.id}_${region.id}`);

                if (!isSelected) {
                    this.renderColumn(region, maxValue, selectionMode, isSelected);
                }
            }
        }
    }

    private renderColumn(
        region: Region,
        maxValue: number,
        selectionMode: boolean,
        isSelected: boolean,
    ): void {
        const { gl, column } = this;
        const { vertexCount } = column;

        const combinedRowName = getCombinedRowName(this.row, this.deltaMode);

        const values = region.rows[combinedRowName];
        const value = lerpArrayValues(values, this.day);

        if (value === 0) {
            return;
        }

        this.renderingProgram.bindUniform(
            'color',
            ...calcColumnColor(this.row, value, maxValue, selectionMode, isSelected),
        );

        const center = MercatorCoordinate.fromLngLat([region.lng, region.lat]);
        this.renderingProgram.bindUniform('center', center.x, center.y);
        this.renderingProgram.bindUniform('height', calcColumnHeight(value));

        gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
    }
}
