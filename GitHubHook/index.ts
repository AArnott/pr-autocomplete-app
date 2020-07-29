import { PullRequest, MergeMethods } from './pr_helper'
import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { Octokit } from '@octokit/rest'
import { createAppAuth } from '@octokit/auth-app'
import { Webhooks } from '@octokit/webhooks'
import Inputs from './inputs'

console.log(`Has GitHubAppId: ${Inputs.GitHubAppId}`);
console.log(`Has GitHubAppPrivateKey?: ${!!Inputs.GitHubAppPrivateKey}`);
console.log(`Has GitHubWebhookSecret?: ${!!Inputs.GitHubWebhookSecret}`);

function getOctokit(installationId?: number) {
    return new Octokit({
        auth: {
            id: Inputs.GitHubAppId,
            privateKey: Inputs.GitHubAppPrivateKey.split('\\n').join('\n'), // we use "\n" literals as placeholders for line endings in the Azure Properties
            installationId,
        },
        authStrategy: createAppAuth,
    });
}

const constants = {
    labelMap : new Map([
        ["auto-merge", "merge"],
        ["auto-squash", "squash"],
        ["auto-rebase", "rebase"]
    ]),
    ready_states: ['clean', 'has_hooks'],
    required_permissions: ['write', 'admin'],
    request_changes: 'CHANGES_REQUESTED',
    comment: 'COMMENTED'
}

let eventCounter = 0

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    context.log(`Event type: ${req.headers['x-github-event']}`)
    context.log(`Event ID: ${req.headers['x-github-delivery']}`)

    const webhooks = new Webhooks({
        secret: Inputs.GitHubWebhookSecret,
    });

    webhooks.on('pull_request', async evt => {
        try {
            context.log(`${context.req.headers['x-github-event']}.${evt.payload.action}: ${++eventCounter}`)
            const octokit = getOctokit((evt.payload as any).installation.id)
            const pullRequest = new PullRequest(evt.payload.pull_request.number, evt.payload, octokit)

            if (evt.payload.action == 'synchronize') {
                if (await isInvalidatingUser(pullRequest, octokit, context)) {
                    return
                }
            }

            await processPullRequest(pullRequest, context)
        } catch (err) {
            context.log(err);
            throw err;
        }
    })

    webhooks.on('pull_request_review', async evt => {
        try {
            context.log(`${context.req.headers['x-github-event']}.${evt.payload.action}: ${++eventCounter}`)
            const octokit = getOctokit((evt.payload as any).installation.id)
            const pullRequest = new PullRequest(evt.payload.pull_request.number, evt.payload, octokit)

            await processPullRequest(pullRequest, context)
        } catch (err) {
            context.log(err);
            throw err;
        }
    });

    webhooks.on('check_suite.completed', async evt => {
        try {
            context.log(`${context.req.headers['x-github-event']}.${evt.payload.action}: ${++eventCounter}`)
            const octokit = getOctokit(evt.payload.installation.id)

            for (const pr of evt.payload.check_suite.pull_requests) {
                const pullRequest = new PullRequest(pr.number, evt.payload, octokit)
                await processPullRequest(pullRequest, context)
            }
        } catch (err) {
            context.log(err);
            throw err;
        }
    })

    await webhooks.verifyAndReceive({
        id: context.req.headers['x-github-delivery'],
        name: context.req.headers['x-github-event'],
        payload: context.req.body,
        signature: context.req.headers['x-hub-signature'],
    });
};

async function processPullRequest(pullRequest: PullRequest, context: Context): Promise<void> {
    // Get the pr data
    const pullRequestData = await pullRequest.get()

    // if multiple labels we return because of ambiguous state
    let labelCount = 0
    let autoCompleteMethod: MergeMethods

    constants.labelMap.forEach((labelValue: string, labelKey: string) => {
        if (pullRequestData?.labels.find(
            label => label.name === labelKey
        )) {
            labelCount ++
            autoCompleteMethod = MergeMethods[labelValue]
        }
    })

    if (labelCount != 1) {
        return
    }

    if (autoCompleteMethod) {
        context.log(`pullRequestData: ${JSON.stringify(pullRequestData)}`)
        if (!constants.ready_states.includes(pullRequestData.mergeable_state)) {
            context.log(`Not completing PR because mergeable_state is ${pullRequestData.mergeable_state}`)
            return
        }

        if (!pullRequestData.mergeable) {
            return
        }

        // Never complete a PR when *anyone* has requested changes (regardless of push permissions or branch protections).
        const reviews = await pullRequest.getReviews()
        context.log("Reviews: " + JSON.stringify(reviews))
        const lastReviewVote = new Map<string, string>();
        for (const review of reviews) {
            // Don't consider comment-only to be a vote one way or another,
            // to be consistent with GitHub UI.
            if (review.state !== constants.comment) {
                lastReviewVote[review.user.login] = review.state;
            }
        }

        for (const voter in lastReviewVote) {
            if (Object.prototype.hasOwnProperty.call(lastReviewVote, voter)) {
                const vote: string = lastReviewVote[voter];
                if (vote === constants.request_changes) {
                    context.log(`Changes requested by ${voter}. Not merging.`);
                    return;
                }
            }
        }

        // Merge the current pull request
        context.log("Attempting to merge...")
        const mergeSucceeded = await pullRequest.merge(autoCompleteMethod)
        context.log(`Merge result: ${mergeSucceeded ? 'succeeded' : 'failed'}`)
    }

}

async function isInvalidatingUser(pullRequest: PullRequest, octokit: Octokit, context: Context): Promise<boolean> {
    // Get the pr data
    const pullRequestData = await pullRequest.get()

    // get person who triggered the event to access their permission
    const username = pullRequest.pull_request.sender.login
    // get their response data using octokit
    const response = await octokit.repos.getCollaboratorPermissionLevel(
        {
            owner: pullRequest.pull_request.repository.owner.login,
            repo: pullRequest.pull_request.repository.name,
            username: username,
        }
    )

    // get user's permission status from response object
    let userPermission = response.data.permission // Permission level of actual user

    // if the user does not have write access we must remove the label
    if (!constants.required_permissions.includes(userPermission)) {
        context.log(`User ${username} does not have permission. Permission: ${userPermission}`)
        
        const labels = pullRequestData?.labels.filter(label => constants.labelMap.has(label.name))
        for (const label of labels) {
            context.log(`Removing ${label.name} label`)
            await pullRequest.removeLabel(label.name)
            context.log(`Remove ${label.name} label`)
        }
        return true // invalid user
    }

    return false
}

export default httpTrigger
