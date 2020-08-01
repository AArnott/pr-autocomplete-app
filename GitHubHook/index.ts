import { PullRequest, MergeMethods } from "./pr_helper"
import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { Octokit } from "@octokit/rest"
import { Webhooks } from "@octokit/webhooks"
import Inputs from "./inputs"
import { getOctokit } from "./OctokitAuth"

const constants = {
	labelMap: new Map([
		["auto-merge", "merge"],
		["auto-squash", "squash"],
		["auto-rebase", "rebase"],
	]),
	ready_states: ["clean", "has_hooks"],
	required_permissions: ["write", "admin"],
	request_changes: "CHANGES_REQUESTED",
	comment: "COMMENTED",
}

let eventCounter = 0

// eslint-disable-next-line func-style
const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
	context.log.info(`Event type: ${req.headers["x-github-event"]}`)
	context.log.info(`Event ID: ${req.headers["x-github-delivery"]}`)

	const webhooks = new Webhooks({
		secret: Inputs.GitHubWebhookSecret,
	})

	if (!context.req) {
		throw new Error("No request data.")
	}

	webhooks.on("installation.created", async evt => {
		try {
			await installRepo(context, evt.payload.installation, evt.payload.repositories)
		} catch (err) {
			context.log.error(err)
			throw err
		}
	})

	webhooks.on("installation_repositories.added", async evt => {
		try {
			await installRepo(context, evt.payload.installation, evt.payload.repositories_added)
		} catch (err) {
			context.log.error(err)
			throw err
		}
	})

	webhooks.on("pull_request", async evt => {
		try {
			if (!context.req) {
				throw new Error("No request data.")
			}

			context.log.info(`${context.req.headers["x-github-event"]}.${evt.payload.action}: ${++eventCounter}`)
			if (evt.payload.action === "closed") {
				return
			}

			const octokit = getOctokit((evt.payload as any).installation.id)
			const pullRequest = new PullRequest(context, evt.payload.pull_request.number, evt.payload, octokit)

			if (evt.payload.action === "synchronize") {
				if (await isInvalidatingUser(pullRequest, octokit, context)) {
					return
				}
			}

			await processPullRequest(pullRequest, context)
		} catch (err) {
			context.log.error(err)
			throw err
		}
	})

	webhooks.on("pull_request_review", async evt => {
		try {
			if (!context.req) {
				throw new Error("No request data.")
			}

			context.log.info(`${context.req.headers["x-github-event"]}.${evt.payload.action}: ${++eventCounter}`)

			if (evt.payload.pull_request.state === "closed") {
				return
			}

			const octokit = getOctokit((evt.payload as any).installation.id)
			const pullRequest = new PullRequest(context, evt.payload.pull_request.number, evt.payload, octokit)

			await processPullRequest(pullRequest, context)
		} catch (err) {
			context.log.error(err)
			throw err
		}
	})

	webhooks.on("check_suite.completed", async evt => {
		try {
			if (!context.req) {
				throw new Error("No request data.")
			}

			if (!evt.payload.installation) {
				throw new Error("No installation property in payload.")
			}

			context.log.info(`${context.req.headers["x-github-event"]}.${evt.payload.action}: ${++eventCounter}`)
			const octokit = getOctokit(evt.payload.installation.id)

			for (const pr of evt.payload.check_suite.pull_requests) {
				const pullRequest = new PullRequest(context, pr.number, evt.payload, octokit)
				await processPullRequest(pullRequest, context)
			}
		} catch (err) {
			context.log.error(err)
			throw err
		}
	})

	await webhooks.verifyAndReceive({
		id: context.req.headers["x-github-delivery"],
		name: context.req.headers["x-github-event"],
		payload: context.req.body,
		signature: context.req.headers["x-hub-signature"],
	})
}

async function processPullRequest(pullRequest: PullRequest, context: Context): Promise<void> {
	// if multiple labels we return because of ambiguous state
	let labelCount = 0
	let autoCompleteMethod: MergeMethods | undefined
	const labels = await pullRequest.labels()

	// eslint-disable-next-line github/array-foreach
	constants.labelMap.forEach((mergeMethod: string, labelName: string) => {
		if (labels.find(label => label.name === labelName)) {
			labelCount++
			autoCompleteMethod = mergeMethod as MergeMethods
		}
	})

	if (labelCount !== 1) {
		return
	}

	if (autoCompleteMethod) {
		const mergeable_state = await pullRequest.mergeable_state()
		if (!constants.ready_states.includes(mergeable_state)) {
			context.log.info(`Not completing PR because mergeable_state is ${mergeable_state}`)
			return
		}

		if (!(await pullRequest.isMergeable())) {
			return
		}

		// Never complete a PR when *anyone* has requested changes (regardless of push permissions or branch protections).
		const reviews = await pullRequest.getReviews()
		context.log.verbose(`Reviews: ${JSON.stringify(reviews)}`)
		const lastReviewVote = new Map<string, string>()
		for (const review of reviews) {
			// Don't consider comment-only to be a vote one way or another,
			// to be consistent with GitHub UI.
			if (review.state !== constants.comment) {
				lastReviewVote.set(review.user.login, review.state)
			}
		}

		for (const entry of lastReviewVote) {
			const voter = entry[0]
			const vote = entry[1]
			if (vote === constants.request_changes) {
				context.log.info(`Changes requested by ${voter}. Not merging.`)
				return
			}
		}

		// Merge the current pull request
		context.log.info("Attempting to merge...")
		const mergeSucceeded = await pullRequest.merge(autoCompleteMethod)
		context.log.info(`Merge result: ${mergeSucceeded ? "succeeded" : "failed"}`)
	}
}

async function isInvalidatingUser(pullRequest: PullRequest, octokit: Octokit, context: Context): Promise<boolean> {
	// get person who triggered the event to access their permission
	const username = pullRequest.pull_request.sender.login
	// get their response data using octokit
	const response = await octokit.repos.getCollaboratorPermissionLevel({
		owner: pullRequest.pull_request.repository.owner.login,
		repo: pullRequest.pull_request.repository.name,
		username,
	})

	// get user's permission status from response object
	const userPermission = response.data.permission // Permission level of actual user

	// if the user does not have write access we must remove the label
	if (!constants.required_permissions.includes(userPermission)) {
		context.log.info(`User ${username} does not have permission. Permission: ${userPermission}`)

		const labels = await pullRequest.labels()
		const filteredLabels = labels.filter(label => constants.labelMap.has(label.name))
		for (const label of filteredLabels) {
			context.log.info(`Removing ${label.name} label`)
			await pullRequest.removeLabel(label.name)
			context.log.info(`Remove ${label.name} label`)
		}
		return true // invalid user
	}

	return false
}

async function installRepo(context: Context, installation: { id: number }, repos: { full_name: string; name: string }[]): Promise<void> {
	const octokit = getOctokit(installation.id)
	for (const repo of repos) {
		for (const label of constants.labelMap) {
			try {
				await octokit.issues.createLabel({
					owner: repo.full_name.split("/")[0],
					repo: repo.name,
					name: label[0],
					color: "0e8a16", // this is a green color
				})
			} catch (err) {
				if (err.status === 422 && err.errors.length === 1 && err.errors[0].code === "already_exists") {
					// The label already exists. No problem.
				} else {
					context.log.error(`Failed to create label: ${err.message}`)
				}
			}
		}
	}
}

export default httpTrigger
