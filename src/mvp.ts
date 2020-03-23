import { projectGeoToMap, degToRad } from './utils';
import { worldSize, near, far, fov } from './constants';

/**
 * Returns a MVP matrix for the current state of the map.
 */
export function getMvpMatrix(map: mapboxgl.Map): number[] {
    const { lat, lng } = map.getCenter();

    const center = projectGeoToMap([lng, lat]);
    const zoom = map.getZoom() + 1;
    const bearing = -degToRad(map.getBearing());
    const pitch = degToRad(map.getPitch());

    const container = map.getContainer();
    const size = [container.clientWidth, container.clientHeight];

    return calcMvp(center, zoom, bearing, pitch, size, near, far, fov);
}

/**
 * Calculates MVP matrix from given map camera params.
 */
function calcMvp(
    center: number[],
    zoom: number,
    bearing: number,
    pitch: number,
    size: number[],
    near: number,
    far: number,
    fov: number,
): number[] {
    const out: number[] = [];

    const eyeHeight = zoomToHeight(zoom, size);
    const offset = Math.max(eyeHeight * Math.sin(pitch), 1);

    const eye = [
        center[0] + Math.sin(bearing) * offset,
        center[1] - Math.cos(bearing) * offset,
        eyeHeight * Math.cos(pitch),
    ];

    // https://github.com/mrdoob/three.js/blob/dev/src/cameras/PerspectiveCamera.js#L171
    // https://github.com/mrdoob/three.js/blob/dev/src/math/Matrix4.js#L817
    const aspect = size[0] / size[1];
    const top = near * Math.tan(degToRad(fov) / 2);
    const height = 2 * top;
    const width = aspect * height;
    const left = -width / 2;

    const right = left + width;
    const bottom = top - height;

    const p00 = (2 * near) / (right - left);
    const p20 = (right + left) / (right - left);
    const p21 = (top + bottom) / (top - bottom);
    const p11 = (2 * near) / (top - bottom);
    const p22 = -(far + near) / (far - near);
    const p32 = (-2 * far * near) / (far - near);

    // Calculate view-matrix
    let v00 = 0;
    let v10 = 0;

    // http://www.3dgep.com/understanding-the-view-matrix/#Look_At_Camera
    // zAxis = normalize(eye - target)
    let v02 = eye[0] - center[0];
    let v12 = eye[1] - center[1];
    let v22 = eye[2] - center[2];
    let len = v02 * v02 + v12 * v12 + v22 * v22;
    if (len > 0.0) {
        const rLen = 1.0 / Math.sqrt(len);
        v02 = v02 * rLen;
        v12 = v12 * rLen;
        v22 = v22 * rLen;
    }

    // xAxis = normalize(cross(up, zAxis))
    len = v12 * v12 + v02 * v02;
    if (len > 0.0) {
        const rLen = 1.0 / Math.sqrt(len);
        v00 = -v12 * rLen;
        v10 = v02 * rLen;
    }

    // yAxis = cross(zAxis, xAxis);
    const v01 = -v22 * v10;
    const v11 = v22 * v00;
    const v21 = v02 * v10 - v12 * v00;

    // v30, v31, v32 calculated as -dot(axis, eye)
    const v30 = -(v00 * eye[0] + v10 * eye[1]);
    const v31 = -(v01 * eye[0] + v11 * eye[1] + v21 * eye[2]);
    const v32 = -(v02 * eye[0] + v12 * eye[1] + v22 * eye[2]);

    // P * V multiplication
    out[0] = p00 * v00 + p20 * v02;
    out[1] = p11 * v01 + p21 * v02;
    out[2] = p22 * v02;
    out[3] = -v02;
    out[4] = p00 * v10 + p20 * v12;
    out[5] = p11 * v11 + p21 * v12;
    out[6] = p22 * v12;
    out[7] = -v12;
    out[8] = p20 * v22;
    out[9] = p11 * v21 + p21 * v22;
    out[10] = p22 * v22;
    out[11] = -v22;
    out[12] = p00 * v30 + p20 * v32;
    out[13] = p11 * v31 + p21 * v32;
    out[14] = p22 * v32 + p32;
    out[15] = -v32;

    return out;
}

function zoomToHeight(zoom: number, size: number[]): number {
    return (size[1] * worldSize) / (2 * 256 * Math.tan(degToRad(fov) / 2) * 2 ** zoom);
}
