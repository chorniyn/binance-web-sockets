import Binance, {WSTrade} from 'binance-api-node';

// Initialize the Binance client
const client = Binance();

interface Stoppable {
    stop(): void;
}

class AsyncGeneratorFromCallback<T> implements Stoppable, AsyncIterable<T> {
    [Symbol.asyncIterator](): AsyncIterator<T, any, any> {
        return this.generate()
    }

    private listeners: ((value: T | undefined) => void)[] = [];
    private stopSignal = false;

    public callback(value: T): void {
        if (this.stopSignal) return;

        if (this.listeners.length > 0) {
            // Resolve the next listener immediately
            const listener = this.listeners.shift();
            listener?.(value);
        } else {
            // Queue the value for later consumption
            this.listeners.push(() => value);
        }
    }

    public stop(): void {
        this.stopSignal = true;
        this.listeners.forEach((listener) => listener(undefined)); // Notify all waiting listeners
        this.listeners = [];
    }


    public async* generate(): AsyncGenerator<T> {
        while (true) {
            const value = await new Promise<T | undefined>((resolve) => {
                if (this.stopSignal) resolve(undefined);
                else this.listeners.push(resolve);
            });

            if (value === undefined) break; // Stop iteration if stopped or no more values
            yield value;
        }
    }
}

class RateLimiter<T> implements AsyncIterable<T> {
    constructor(private iterable: AsyncIterable<T>, private frequency: number) {
    }

    private lastUpdate = Number.NEGATIVE_INFINITY;

    [Symbol
        .asyncIterator](): AsyncIterator<T, any, any> {
        return this.generate()
    }

    private async* generate(): AsyncGenerator<T> {
        for await (const value of this.iterable) {
            const now = Date.now();
            if (now - this.lastUpdate < this.frequency) {
                // Skip the value if it's too soon
                continue;
            }
            this.lastUpdate = now;
            yield value;
        }
    }
}

export function subscribeToBinanceUpdates<T>(callbackSetup: (callback: (value: T) => void) => void,
                                             frequencyInSeconds: number = 5): AsyncIterable<T> {
    const iterable = new AsyncGeneratorFromCallback<T>();
    callbackSetup((value) => iterable.callback(value));
    return new RateLimiter(iterable, frequencyInSeconds * 1000)
}

export const subscribeToTrades = (pairs: string | string[] = ['BTCUSDT'], frequencyInSeconds: number = 5) =>
    subscribeToBinanceUpdates<WSTrade>((callback) => client.ws.trades(pairs, callback), frequencyInSeconds)
