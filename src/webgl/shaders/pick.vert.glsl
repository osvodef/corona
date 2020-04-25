uniform mat4 mvp;
uniform vec4 color;
uniform vec2 center;
uniform float height;

attribute vec3 position;

varying vec4 colorVarying;

void main() {
    colorVarying = color;
	gl_Position = mvp * vec4(position.x + center.x, position.y + center.y, position.z * height, 1.0);
}
