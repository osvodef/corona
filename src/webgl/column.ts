import { Region, Country } from '../types';
import { MercatorCoordinate } from 'mapbox-gl';
import { columnFaceCount, columnWidth } from '../constants';

export class Column {
    public positionBuffer: WebGLBuffer;
    public normalBuffer: WebGLBuffer;
    public vertexCount: number;
    public country: Country;
    public region: Region;
    public key: string;
    public id: number;

    constructor(gl: WebGLRenderingContext, country: Country, region: Region, id: number) {
        const { lat, lng } = region;

        this.positionBuffer = gl.createBuffer() as WebGLBuffer;
        this.normalBuffer = gl.createBuffer() as WebGLBuffer;
        this.vertexCount = columnFaceCount * 9;

        this.id = id;
        this.region = region;
        this.country = country;
        this.key = `${country.id}_${region.id}`;

        this.fillBuffers(gl, MercatorCoordinate.fromLngLat([lng, lat]));
    }

    private fillBuffers(gl: WebGLRenderingContext, center: MercatorCoordinate): void {
        const { positionBuffer, normalBuffer, vertexCount } = this;

        const positions = new Float32Array(vertexCount * 3);
        const normals = new Float32Array(vertexCount * 3);
        let positionIndex = 0;
        let normalIndex = 0;
        const angleStep = -(2 * Math.PI) / columnFaceCount;
        for (let i = 0; i < columnFaceCount; i++) {
            const wallAngle = angleStep * (i + 0.5);
            const wallAngleCos = Math.cos(wallAngle);
            const wallAngleSin = Math.sin(wallAngle);

            const x1 = center.x + columnWidth * Math.cos(angleStep * i);
            const y1 = center.y + columnWidth * Math.sin(angleStep * i);

            const x2 = center.x + columnWidth * Math.cos(angleStep * (i + 1));
            const y2 = center.y + columnWidth * Math.sin(angleStep * (i + 1));

            // Generating the top part:
            positions[positionIndex++] = center.x;
            positions[positionIndex++] = center.y;
            positions[positionIndex++] = 1;
            normals[normalIndex++] = 0;
            normals[normalIndex++] = 0;
            normals[normalIndex++] = 1;

            positions[positionIndex++] = x1;
            positions[positionIndex++] = y1;
            positions[positionIndex++] = 1;
            normals[normalIndex++] = 0;
            normals[normalIndex++] = 0;
            normals[normalIndex++] = 1;

            positions[positionIndex++] = x2;
            positions[positionIndex++] = y2;
            positions[positionIndex++] = 1;
            normals[normalIndex++] = 0;
            normals[normalIndex++] = 0;
            normals[normalIndex++] = 1;

            // Generating the wall:
            positions[positionIndex++] = x1;
            positions[positionIndex++] = y1;
            positions[positionIndex++] = 0;
            normals[normalIndex++] = wallAngleCos;
            normals[normalIndex++] = wallAngleSin;
            normals[normalIndex++] = 0;

            positions[positionIndex++] = x2;
            positions[positionIndex++] = y2;
            positions[positionIndex++] = 0;
            normals[normalIndex++] = wallAngleCos;
            normals[normalIndex++] = wallAngleSin;
            normals[normalIndex++] = 0;

            positions[positionIndex++] = x1;
            positions[positionIndex++] = y1;
            positions[positionIndex++] = 1;
            normals[normalIndex++] = wallAngleCos;
            normals[normalIndex++] = wallAngleSin;
            normals[normalIndex++] = 0;

            positions[positionIndex++] = x2;
            positions[positionIndex++] = y2;
            positions[positionIndex++] = 0;
            normals[normalIndex++] = wallAngleCos;
            normals[normalIndex++] = wallAngleSin;
            normals[normalIndex++] = 0;

            positions[positionIndex++] = x2;
            positions[positionIndex++] = y2;
            positions[positionIndex++] = 1;
            normals[normalIndex++] = wallAngleCos;
            normals[normalIndex++] = wallAngleSin;
            normals[normalIndex++] = 0;

            positions[positionIndex++] = x1;
            positions[positionIndex++] = y1;
            positions[positionIndex++] = 1;
            normals[normalIndex++] = wallAngleCos;
            normals[normalIndex++] = wallAngleSin;
            normals[normalIndex++] = 0;
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);
    }
}
