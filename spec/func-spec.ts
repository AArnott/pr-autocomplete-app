/* eslint-disable no-console */

import func from "../GitHubHook/index"
import { Context, HttpRequest } from "@azure/functions"
import mockedEnv, { RestoreFn } from "mocked-env"

let restore: RestoreFn
beforeEach(() => {
	restore = mockedEnv({
		GitHubAppId: "1234",
		GitHubWebhookSecret: "some secret",
	})
})

afterEach(() => {
	restore()
})

describe("Azure Function", () => {
	it("rejects bad signature", async () => {
		const context: Context = NewContext(NewHttpRequest())
		await expect(func(context, context.req)).rejects.toThrowError("signature does not match event payload and secret")
	})
})

function NewHttpRequest(): HttpRequest {
	return {
		method: "POST",
		url: "mock",
		headers: {
			"x-github-delivery": "mock-guid",
			"x-github-event": "mock-event",
			"x-hub-signature": "signature",
		},
		body: JSON.stringify({}),
		query: {},
		params: {},
	}
}

function NewContext(req: HttpRequest): Context {
	return {
		req,
		invocationId: "test-id",
		bindings: {},
		bindingData: {},
		bindingDefinitions: [],
		done: (): void => {
			throw new Error("not implemented")
		},
		traceContext: {
			traceparent: undefined,
			tracestate: undefined,
			attributes: undefined,
		},
		executionContext: {
			functionDirectory: "mock",
			functionName: "mock",
			invocationId: "mock",
		},
		log: MockLogger,
	}
}

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
	console.info(...args)
}

MockLogger.verbose = function verbose(...args: any[]): void {
	console.info(...args)
}
