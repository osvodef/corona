uniform mat4 mvp;
uniform vec4 color;
uniform vec2 center;
uniform float height;

attribute vec3 position;
attribute vec3 normal;

varying vec4 colorVarying;

void main() {
	gl_Position = mvp * vec4(position.x + center.x, position.y + center.y, position.z * height, 1.0);

    if (normal.z == 1.0) {
        // This is a top part
        colorVarying = color;
    } else {
        // This is a wall
        colorVarying = color -
            vec4(0.3, 0.3, 0.3, 0.0) * (0.1 + abs(dot(normal, vec3(0.966, 0.259, 0.0))));
    }
}
