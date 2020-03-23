export abstract class EventEmitter {
    private eventHandlers: { [key: string]: (...params: any[]) => void };

    constructor() {
        this.eventHandlers = {};
    }

    public on(eventName: string, handler: (...params: any[]) => void): void {
        this.eventHandlers[eventName] = handler;
    }

    public off(eventName: string): void {
        delete this.eventHandlers[eventName];
    }

    public fire(eventName: string, ...params: any[]): void {
        const handler = this.eventHandlers[eventName];

        if (handler !== undefined) {
            handler(...params);
        }
    }
}
