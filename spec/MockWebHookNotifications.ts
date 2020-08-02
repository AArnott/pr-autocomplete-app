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
		completed: ParseMockMessage("check_run.completed.json"),
	},
	check_suite: {
		completed: {
			fromFork: ParseMockMessage("check_suite.completed_fromFork.json"),
			sameRepo: ParseMockMessage("check_suite.completed.json"),
		},
	},
	installation: {
		created: ParseMockMessage("installation.created.json"),
	},
	installation_repositories: {
		added: ParseMockMessage("installation_repositories.added.json"),
	},
	pull_request_review: {
		submitted: ParseMockMessage("pull_request_review.submitted.json"),
		submitted_closedPR: ParseMockMessage("pull_request_review.submitted_closedPR.json"),
		submitted_openUnlabeled: ParseMockMessage("pull_request_review.submitted_openUnlabeled.json"),
	},
	pull_request: {
		labeled: ParseMockMessage("pull_request.labeled.json"),
		unlabeled: ParseMockMessage("pull_request.unlabeled.json"),
		synchronize: ParseMockMessage("pull_request.synchronize.json"),
		closed: ParseMockMessage("pull_request.closed.json"),
	},
}
