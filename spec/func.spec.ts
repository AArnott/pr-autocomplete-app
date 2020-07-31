import func from "../GitHubHook/index"
import { authInputs } from "../GitHubHook/OctokitAuth"
import { MockNotifications } from "./MockWebHookNotifications"
import { MockReplies } from "./MockApiReplies"
import { NewContext } from "./MockAzureContext"
import nock from "nock"

beforeAll(() => {
	authInputs.auth = "mock-token"
})

beforeEach(() => {
	nock.cleanAll()
})

afterEach(() => {
	expect(nock.pendingMocks()).toEqual([])
	expect(nock.isDone()).toBeTruthy()
})

describe("Web hook", () => {
	it("rejects bad signature", async () => {
		const context = NewContext({ eventType: "pull_request", payload: {} })
		context.req!.headers["x-hub-signature"] = "bad sig"
		await expect(func(context, context.req)).rejects.toThrowError("signature does not match event payload and secret")
	})

	it("pull_request.closed does nothing", async () => {
		const context = NewContext(MockNotifications.pull_request.closed)
		await func(context, context.req)
	})

	it("pull_request_review.submitted does nothing when PR is closed", async () => {
		const context = NewContext(MockNotifications.pull_request_review.submitted_closedPR)
		await func(context, context.req)
	})

	it("pull_request_review.submitted on unlabeled PR does nothing", async () => {
		const context = NewContext(MockNotifications.pull_request_review.submitted_openUnlabeled)
		await func(context, context.req)
	})

	it("pull_request.synchronize from admin does not remove label", async () => {
		const context = NewContext(MockNotifications.pull_request.synchronize)

		nock("https://api.github.com")
			.get("/repos/AArnott/pr-autocomplete-scratch/collaborators/AArnott/permission")
			.reply(200, MockReplies.get.permission.admin)

		await func(context, context.req)
	})

	it("pull_request.synchronize from contributor does not remove label", async () => {
		const context = NewContext(MockNotifications.pull_request.synchronize)

		nock("https://api.github.com")
			.get("/repos/AArnott/pr-autocomplete-scratch/collaborators/AArnott/permission")
			.reply(200, MockReplies.get.permission.write)

		await func(context, context.req)
	})

	it("pull_request.synchronize from non-contributor removes label", async () => {
		const context = NewContext(MockNotifications.pull_request.synchronize)

		nock("https://api.github.com")
			.get("/repos/AArnott/pr-autocomplete-scratch/collaborators/AArnott/permission")
			.reply(200, MockReplies.get.permission.read)
		nock("https://api.github.com").delete("/repos/AArnott/pr-autocomplete-scratch/issues/19/labels/auto-merge").reply(200)

		await func(context, context.req)
	})
})
