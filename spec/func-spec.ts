/* eslint-disable no-console */

import func from "../GitHubHook/index"
import { Context, HttpRequest } from "@azure/functions"
import mockedEnv, { RestoreFn } from "mocked-env"
import { Webhooks } from "@octokit/webhooks"
import fs from "fs"

interface IMockMessage {
	eventType: ExpectedEventTypes
	payload: {}
}

function ParseMockMessage(name: string): IMockMessage {
	return {
		eventType: name.split(".")[0] as ExpectedEventTypes,
		payload: JSON.parse(fs.readFileSync(`${__dirname}/../testAssets/${name}`).toString()),
	}
}

const MockMessages = {
	pull_request: {
		closed: ParseMockMessage("pull_request.closed.json"),
	},
}

const mockWebhookSecret = "some secret"

let restore: RestoreFn
beforeEach(() => {
	restore = mockedEnv({
		GitHubAppId: "1234",
		GitHubWebhookSecret: mockWebhookSecret,
	})
})

const webhooks = new Webhooks({
	secret: mockWebhookSecret,
})

afterEach(() => {
	restore()
})

describe("Azure Function", () => {
	it("rejects bad signature", async () => {
		const context: Context = NewContext(NewHttpRequest({ eventType: "pull_request", payload: {} }))
		context.req!.headers["x-hub-signature"] = "bad sig"
		await expect(func(context, context.req)).rejects.toThrowError("signature does not match event payload and secret")
	})

	it("does nothing with pull_request.closed", async () => {
		const context: Context = NewContext(NewHttpRequest(MockMessages.pull_request.closed))
		await func(context, context.req)
	})
})

type ExpectedEventTypes = "pull_request" | "pull_request_review" | "check_suite"

function NewHttpRequest(mockMessage: IMockMessage): HttpRequest {
	return {
		method: "POST",
		url: "mock",
		headers: {
			"x-github-delivery": "mock-guid",
			"x-github-event": mockMessage.eventType,
			"x-hub-signature": webhooks.sign(mockMessage.payload),
		},
		body: mockMessage.payload,
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
