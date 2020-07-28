// import {Context} from '@actions/github/lib/context'
// import {GitHub} from '@actions/github/lib/utils'

import { Octokit } from '@octokit/rest'
import { PullsGetResponseData } from '@octokit/types/dist-types'


export class PullRequest {

    constructor(readonly number:number, readonly repo:string, readonly owner:string, readonly actor:string, private octokit: Octokit) {
	}

	async get(): Promise<PullsGetResponseData | undefined> {
		const response = await this.octokit.pulls.get({
			owner: this.owner,
			repo: this.repo,
			pull_number: this.number,
		})

		return response.data
	}

	async merge(mergeMethod: 'merge' | 'squash' | 'rebase' | undefined): Promise<boolean> {
		const response = await this.octokit.pulls.merge({
			owner: this.owner,
			repo: this.repo,
			pull_number: this.number,
			merge_method: mergeMethod,
		})
		return response.status === 200
	}

	async removeLabel(name:string): Promise<boolean> {
		const response = await this.octokit.issues.removeLabel({
			owner: this.owner,
			repo: this.repo,
			issue_number: this.number,
			name: name,
		})
		
		return response.status === 200
	}
}
