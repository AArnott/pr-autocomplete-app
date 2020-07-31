import fs from "fs"

type ExpectedEventTypes = "pull_request" | "pull_request_review" | "check_suite"

export interface IMockMessage {
	eventType: ExpectedEventTypes
	payload: {}
}

function ParseMockMessage(name: string): IMockMessage {
	return {
		eventType: name.split(".")[0] as ExpectedEventTypes,
		payload: JSON.parse(fs.readFileSync(`${__dirname}/testAssets/${name}`).toString()),
	}
}

export const MockMessages = {
	pull_request: {
		closed: ParseMockMessage("pull_request.closed.json"),
	},
}
