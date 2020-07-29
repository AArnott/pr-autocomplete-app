// import {Context} from '@actions/github/lib/context'
// import {GitHub} from '@actions/github/lib/utils'

import { Octokit } from '@octokit/rest'
import { PullsGetResponseData } from '@octokit/types/dist-types'
import { Webhooks } from '@octokit/webhooks'

type PRInfo = {
	repository: Webhooks.PayloadRepository;
	sender: Webhooks.WebhookPayloadPullRequestSender;
}

export class PullRequest {
	private data?: PullsGetResponseData;

	constructor(readonly pullRequestNumber: number, readonly pull_request: PRInfo, private octokit: Octokit) {
	}

	async get(): Promise<PullsGetResponseData> {
		if (!this.data) {
			const response = await this.octokit.pulls.get({
				owner: this.pull_request.repository.owner.login,
				repo: this.pull_request.repository.name,
				pull_number: this.pullRequestNumber,
			})
			this.data = response.data
		}

		return this.data
	}

	async merge(mergeMethod: 'merge' | 'squash' | 'rebase' | undefined): Promise<boolean> {
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
