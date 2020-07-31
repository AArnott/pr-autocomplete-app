import func from "../GitHubHook/index"
import { authInputs } from "../GitHubHook/OctokitAuth"
import { MockNotifications } from "./MockWebHookNotifications"
import { MockReplies } from "./MockApiReplies"
import { NewContext } from "./MockAzureContext"
import nock from "nock"

describe("Azure Function", () => {
	it("rejects bad signature", async () => {
		const context = NewContext({ eventType: "pull_request", payload: {} })
		context.req!.headers["x-hub-signature"] = "bad sig"
		await expect(func(context, context.req)).rejects.toThrowError("signature does not match event payload and secret")
	})

	it("does nothing with pull_request.closed", async () => {
		const context = NewContext(MockNotifications.pull_request.closed)
		await func(context, context.req)
	})

	it("does nothing when review is submitted for completed PR", async () => {
		nock("https://api.github.com").get("/repos/AArnott/pr-autocomplete-scratch/pulls/16").reply(200, MockReplies.get.pr.completed)
		const context = NewContext(MockNotifications.pull_request_review.submitted)
		authInputs.auth = "mock-token"
		await func(context, context.req)
	})
})
