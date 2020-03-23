declare module '*.glsl' {
    const source: string;
    export default source;
}

declare module 'date-and-time' {
    export function plugin(name: string): void;
    export function parse(dateString: string, formatString: string): Date;
    export function format(date: Date, formatString: string): string;
    export function isValid(dateString: string, formatString: string): boolean;
}
