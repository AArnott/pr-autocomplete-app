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
    context.log('HTTP trigger function processed a request.');
    context.log(`Has GitHubAppId: ${Inputs.GitHubAppId}`);
    context.log(`Has GitHubAppPrivateKey?: ${!!Inputs.GitHubAppPrivateKey}`);
    context.log(`Has GitHubWebhookSecret?: ${!!Inputs.GitHubWebhookSecret}`);
    context.log(`Event type: ${req.headers['x-github-event']}`)

    webhooks.on('check_run.completed', evt => {
        context.log('check_run.completed');
        context.log(JSON.stringify(evt))
        // evt.payload.installation.id
    })

    webhooks.on('pull_request', async evt => {
        try {
            context.log('pull_request');
            context.log(JSON.stringify(evt))

            const pullRequest = new PullRequest(evt.payload.pull_request.number,
                evt.payload.repository.name,
                evt.payload.repository.owner.login,
                evt.payload.sender.login,
                getOctokit((evt.payload as any).installation.id))

            await processPullRequest(pullRequest, getOctokit((evt.payload as any).installation.id), context)
        } catch (err) {
            context.log('Error occurred: ' + err);
            throw err;
        }
    })

    webhooks.on('check_suite.completed', async evt => {
        context.log('check_suite.completed');
        context.log(JSON.stringify(evt))
        const pullRequests = evt.payload.check_suite.pull_requests

        if (pullRequests && pullRequests.length > 0) {
            const pullRequestNumber = pullRequests[0].number
            const pullRequest = new PullRequest(pullRequestNumber,
                evt.payload.repository.name,
                evt.payload.repository.owner.login,
                evt.payload.sender.login,
                getOctokit((evt.payload as any).installation.id))

            await processPullRequest(pullRequest, getOctokit(evt.payload.installation.id), context)
        }
    })

    // parse pull request event
    webhooks.on("pull_request.opened", (evt) => {
        context.log('pull_request.opened')
        context.log(JSON.stringify(evt))
    })

    try {
        await webhooks.verifyAndReceive({
            id: context.req.headers['x-github-delivery'],
            name: context.req.headers['x-github-event'],
            payload: context.req.body,
            signature: context.req.headers['x-hub-signature'],
        });
    } catch (err) {
        context.log('Error occurred: ' + err);
        throw err;
    }
};

async function processPullRequest(pullRequest: PullRequest, octokit: Octokit, context: Context): Promise<void> {
    // Get the pr data
    const pullRequestData = await pullRequest.get()
    if (!pullRequestData) {
        context.log('Skipping because it is not a pull request.')
        return
    }

    // Find the labels that indicates the auto completion
    const hasAutoMergeLabel = pullRequestData?.labels.find(
        label => label.name === constants.autoMergeLabel
    )
    const hasAutoSquashLabel = pullRequestData?.labels.find(
        label => label.name === constants.autoSquashLabel
    )

    // get person who triggered the event to access their permission
    const username = pullRequest.actor
    // get their response data using octokit
    const response = await octokit.repos.getCollaboratorPermissionLevel(
        {
            owner: pullRequest.owner,
            repo: pullRequest.repo,
            username: username,
        }
    )

    // get user's permission status from response object
    let userPermission = response.data.permission // Permission level of actual user

    // if the user does not have write access we must remove the label
    if (!constants.required_permissions.includes(userPermission)) {
        context.log(`User ${username} does not have permission. Permission: ${userPermission}`)

        if (hasAutoMergeLabel) {
            context.log(`User ${username} removing automerge label: ${userPermission}`)
            await pullRequest.removeLabel(constants.autoMergeLabel)
        }
        if (hasAutoSquashLabel) {
            context.log(`User ${username} removing autosquash label: ${userPermission}`)
            await pullRequest.removeLabel(constants.autoSquashLabel)
        }

        // abort the process because they don't have write/admin permission and cannot make changes
        // once the labels have been assigned
        return
    }

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
        const mergeSucceeded = await pullRequest.merge(autoCompleteMethod)
        context.log(`Merge result: ${mergeSucceeded ? 'succeeded' : 'failed'}`)
    }

}

export default httpTrigger;
