export enum LogLevel {
	INFO = "INFO",
	WARN = "WARN",
	ERROR = "ERROR",
	DEBUG = "DEBUG",
}

export class Logger {
	private static getTimestamp(): string {
		return new Date().toISOString();
	}

	private static format(level: LogLevel, message: string): string {
		const color = {
			[LogLevel.INFO]: "\x1b[32m", // Green
			[LogLevel.WARN]: "\x1b[33m", // Yellow
			[LogLevel.ERROR]: "\x1b[31m", // Red
			[LogLevel.DEBUG]: "\x1b[34m", // Blue
		}[level];
		const reset = "\x1b[0m";
		return `${color}[${this.getTimestamp()}] [${level}]${reset} ${message}`;
	}

	static info(message: string) {
		console.log(this.format(LogLevel.INFO, message));
	}

	static warn(message: string) {
		console.log(this.format(LogLevel.WARN, message));
	}

	static error(message: string, error?: any) {
		console.error(this.format(LogLevel.ERROR, message));
		if (error) {
			if (error instanceof Error) {
				console.error(error.stack);
			} else {
				console.error(error);
			}
		}
	}

	static debug(message: string) {
		if (process.env.DEBUG === "true") {
			console.log(this.format(LogLevel.DEBUG, message));
		}
	}
}
