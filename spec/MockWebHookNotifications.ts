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

export const MockNotifications = {
	check_run: {
		created: {
			fromFork: ParseMockMessage("check_run.created_fromFork.json"),
		},
	},
	check_suite: {
		completed: {
			fromFork: ParseMockMessage("check_suite.completed_fromFork.json"),
		},
	},
	installation_repositories: {
		added: ParseMockMessage("installation_repositories.added.json"),
	},
	pull_request_review: {
		submitted: ParseMockMessage("pull_request_review.submitted.json"),
	},
	pull_request: {
		labeled: ParseMockMessage("pull_request.labeled.json"),
		synchronize: ParseMockMessage("pull_request.synchronize.json"),
		closed: ParseMockMessage("pull_request.closed.json"),
	},
}
