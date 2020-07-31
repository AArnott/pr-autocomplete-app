/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console */

function MockLogger(...args: any[]): void {
	console.log(...args)
}

MockLogger.error = function error(...args: any[]): void {
	console.error(...args)
}

MockLogger.warn = function warn(...args: any[]): void {
	console.warn(...args)
}

MockLogger.info = function info(...args: any[]): void {
	// console.info(...args)
}

MockLogger.verbose = function verbose(...args: any[]): void {
	// console.info(...args)
}

export default MockLogger
