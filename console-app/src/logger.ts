// Custom log format to handle objects

export const logger = {
    error: (message: string, ...args: any[] ) => console.error(message, ...args),
    info: (message: string, ...args: any[] ) => console.info(message, ...args)
}
