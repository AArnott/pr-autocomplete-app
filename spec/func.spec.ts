import func from "../GitHubHook/index"
import { Context } from "@azure/functions"
import { MockMessages } from "./MockMessages"
import { NewContext } from "./MockAzureContext"

describe("Azure Function", () => {
	it("rejects bad signature", async () => {
		const context: Context = NewContext({ eventType: "pull_request", payload: {} })
		context.req!.headers["x-hub-signature"] = "bad sig"
		await expect(func(context, context.req)).rejects.toThrowError("signature does not match event payload and secret")
	})

	it("does nothing with pull_request.closed", async () => {
		const context: Context = NewContext(MockMessages.pull_request.closed)
		await func(context, context.req)
	})
})
