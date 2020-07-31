import { IMockMessage } from "./MockWebHookNotifications"
import { HttpRequest, Context } from "@azure/functions"
import MockLogger from "./MockLogger"
import Webhooks from "@octokit/webhooks"
import mockedEnv, { RestoreFn } from "mocked-env"

const mockWebhookSecret = "some secret"

export const webhooks = new Webhooks({
	secret: mockWebhookSecret,
})

let restore: RestoreFn
beforeEach(() => {
	restore = mockedEnv({
		GitHubAppId: "1234",
		GitHubWebhookSecret: mockWebhookSecret,
	})
})

afterEach(() => {
	restore()
})

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

export function NewContext(mockMessage: IMockMessage): Context {
	return {
		req: NewHttpRequest(mockMessage),
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
