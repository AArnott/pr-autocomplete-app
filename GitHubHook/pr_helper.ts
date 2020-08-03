import { Octokit } from "@octokit/rest"
import { PullsGetResponseData, PullsListReviewsResponseData } from "@octokit/types/dist-types"
import { EventPayloads } from "@octokit/webhooks"
import { Context } from "@azure/functions"

type PRInfo = {
	pull_request?: EventPayloads.WebhookPayloadPullRequestPullRequest | EventPayloads.WebhookPayloadPullRequestReviewPullRequest
	repository: EventPayloads.PayloadRepository
	sender: EventPayloads.WebhookPayloadPullRequestSender
}

export enum MergeMethods {
	merge = "merge",
	squash = "squash",
	rebase = "rebase",
}

export class PullRequest {
	private data?: PullsGetResponseData

	constructor(readonly context: Context, readonly pullRequestNumber: number, readonly pull_request: PRInfo, private octokit: Octokit) {
		// blank (but keep prettier happy)
	}

	async isMergeable(): Promise<boolean> {
		// Try to get the mergeable state from the push notification, if possible.
		const mergeablePullRequest = this.pull_request.pull_request as EventPayloads.WebhookPayloadPullRequestPullRequest
		let mergeable: boolean | null | undefined = mergeablePullRequest?.mergeable
		if (mergeable === undefined || mergeable === null) {
			const data = await this.get()
			mergeable = data.mergeable
		}

		return mergeable
	}

	async mergeable_state(): Promise<string> {
		let mergeable_state: string | undefined = (this.pull_request.pull_request as EventPayloads.WebhookPayloadPullRequestPullRequest)
			?.mergeable_state
		if (mergeable_state === undefined || mergeable_state === null) {
			const data = await this.get()
			mergeable_state = data.mergeable_state
		}

		return mergeable_state
	}

	async labels(): Promise<{ name: string }[]> {
		if (this.pull_request.pull_request) {
			return this.pull_request.pull_request.labels
		} else {
			const data = await this.get()
			return data.labels
		}
	}

	private async get(): Promise<PullsGetResponseData> {
		if (!this.data) {
			const response = await this.octokit.pulls.get({
				owner: this.pull_request.repository.owner.login,
				repo: this.pull_request.repository.name,
				pull_number: this.pullRequestNumber,
			})
			this.data = response.data
			this.context.log.verbose(`Obtained pull request data: ${JSON.stringify(response.data)}`)
		}

		return this.data
	}

	async getReviews(): Promise<PullsListReviewsResponseData> {
		const response = await this.octokit.pulls.listReviews({
			owner: this.pull_request.repository.owner.login,
			repo: this.pull_request.repository.name,
			pull_number: this.pullRequestNumber,
		})

		if (response.status !== 200) {
			throw new Error("Failed in request for reviews.")
		}

		return response.data
	}

	async merge(mergeMethod: MergeMethods): Promise<boolean> {
		const response = await this.octokit.pulls.merge({
			owner: this.pull_request.repository.owner.login,
			repo: this.pull_request.repository.name,
			pull_number: this.pullRequestNumber,
			merge_method: mergeMethod,
		})

		return response.status === 200
	}

	async removeLabel(name: string): Promise<boolean> {
		const response = await this.octokit.issues.removeLabel({
			owner: this.pull_request.repository.owner.login,
			repo: this.pull_request.repository.name,
			issue_number: this.pullRequestNumber,
			name,
		})

		return response.status === 200
	}
}
