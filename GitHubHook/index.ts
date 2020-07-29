import { PullRequest } from './pr_helper'
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

const webhooks = new Webhooks({
    secret: Inputs.GitHubWebhookSecret,
});

const constants = {
    autoMergeLabel: 'auto-merge',
    autoSquashLabel: 'auto-squash',
    ready_states: ['clean', 'has_hooks'],
    required_permissions: ['write', 'admin'],
}

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    context.log(`Event type: ${req.headers['x-github-event']}`)
    context.log(`Event ID: ${req.headers['x-github-delivery']}`)

    webhooks.on('pull_request', async evt => {
        try {
            context.log(`${context.req.headers['x-github-event']}.${evt.payload.action}`)
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

    webhooks.on('check_suite.completed', async evt => {
        try {
            context.log(`${context.req.headers['x-github-event']}.${evt.payload.action}`)
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

    // Find the labels that indicates the auto completion
    const hasAutoMergeLabel = pullRequestData?.labels.find(
        label => label.name === constants.autoMergeLabel
    )
    const hasAutoSquashLabel = pullRequestData?.labels.find(
        label => label.name === constants.autoSquashLabel
    )

    // Check for valid labels
    if (hasAutoMergeLabel && hasAutoSquashLabel) {
        // Do nothing, since we're in an ambiguous state with multiple labels defined.
        return
    }

    const autoCompleteMethod = hasAutoMergeLabel ? 'merge'
        : hasAutoSquashLabel ? 'squash'
            : undefined

    if (autoCompleteMethod) {
        context.log(`pullRequestData: ${JSON.stringify(pullRequestData)}`)
        if (!constants.ready_states.includes(pullRequestData.mergeable_state)) {
            context.log(`Not completing PR because mergeable_state is ${pullRequestData.mergeable_state}`)
            return
        }

        if (!pullRequestData.mergeable) {
            return
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

        const hasAutoMergeLabel = pullRequestData?.labels.find(
            label => label.name === constants.autoMergeLabel
        )
        const hasAutoSquashLabel = pullRequestData?.labels.find(
            label => label.name === constants.autoSquashLabel
        )

        if (hasAutoMergeLabel) {
            context.log(`Removing auto-merge label`)
            await pullRequest.removeLabel(constants.autoMergeLabel)
        }
        if (hasAutoSquashLabel) {
            context.log(`Removing auto-squash label`)
            await pullRequest.removeLabel(constants.autoSquashLabel)
        }

        return true // invalid user
    }

    return false
}

export default httpTrigger;
