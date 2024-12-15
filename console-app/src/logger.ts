// Custom log format to handle objects
import {createLogger, format, transports} from "winston";
import {programOptions} from "./program-args";

const logFolder = programOptions.logPath
const customFormat = format.printf(({ timestamp, level, message, ...meta }) => {
    let metaString = '';

    // Check if there are additional metadata fields and format them as JSON
    if (Object.keys(meta).length) {
        metaString = `: ${JSON.stringify(meta)}`;
    }

    return `${timestamp} - ${level.toUpperCase()}: ${message}${metaString}`;
});
// Create a Winston logger instance
export const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }), // Include error stack if any
        format.splat(), // Handle parameterized logging
        customFormat
    ),
    transports: [
        new transports.File({ filename: 'binance-store.log', ...(logFolder ? {dirname: logFolder} : {}) })
    ],
});
