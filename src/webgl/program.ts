interface UniformDescriptor {
    name: string;
    type: UniformType;
}

type UniformType = '1i' | '1f' | '2f' | '4f' | '4m';

export class Program {
    private gl: WebGLRenderingContext;
    private webglProgram: WebGLProgram;

    private attributes: { [name: string]: Attribute };
    private uniforms: { [name: string]: Uniform };

    constructor(
        gl: WebGLRenderingContext,
        vertexShaderSource: string,
        fragmentShaderSource: string,
        attributes: string[],
        uniforms: UniformDescriptor[],
    ) {
        const program = gl.createProgram() as WebGLProgram;

        const vertexShader = gl.createShader(gl.VERTEX_SHADER) as WebGLShader;
        gl.shaderSource(vertexShader, vertexShaderSource);
        gl.compileShader(vertexShader);

        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER) as WebGLShader;
        gl.shaderSource(fragmentShader, fragmentShaderSource);
        gl.compileShader(fragmentShader);

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        this.gl = gl;
        this.webglProgram = program;

        this.uniforms = {};
        for (const uniform of uniforms) {
            this.uniforms[uniform.name] = new Uniform(gl, program, uniform.name, uniform.type);
        }

        this.attributes = {};
        for (const name of attributes) {
            this.attributes[name] = new Attribute(gl, program, name);
        }
    }

    public use(): void {
        this.gl.useProgram(this.webglProgram);
    }

    public bindAttribute(name: string, buffer: WebGLBuffer): void {
        this.attributes[name].bind(buffer);
    }

    public bindUniform(name: string, ...value: number[]): void {
        this.uniforms[name].set(...value);
    }
}

class Uniform {
    private type: UniformType;

    private gl: WebGLRenderingContext;
    private location: WebGLUniformLocation;

    constructor(gl: WebGLRenderingContext, program: WebGLProgram, name: string, type: UniformType) {
        this.gl = gl;
        this.type = type;

        this.location = gl.getUniformLocation(program, name) as WebGLUniformLocation;
    }

    set(...value: number[]): void {
        const { gl, location } = this;

        switch (this.type) {
            case '1i':
                gl.uniform1i(location, value[0]);
                break;
            case '1f':
                gl.uniform1f(location, value[0]);
                break;
            case '2f':
                gl.uniform2f(location, value[0], value[1]);
                break;
            case '4f':
                gl.uniform4f(location, value[0], value[1], value[2], value[3]);
                break;
            case '4m':
                gl.uniformMatrix4fv(location, false, value);
                break;
        }
    }
}

class Attribute {
    private gl: WebGLRenderingContext;

    private location: number;

    constructor(gl: WebGLRenderingContext, program: WebGLProgram, name: string) {
        this.gl = gl;
        this.location = gl.getAttribLocation(program, name);
    }

    public bind(buffer: WebGLBuffer) {
        const { gl, location } = this;

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 0, 0);
    }
}
