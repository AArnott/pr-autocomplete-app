
import { PullRequest } from './pr_helper'
import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { Octokit } from '@octokit/rest'
import { createAppAuth } from '@octokit/auth-app'
import { Webhooks } from '@octokit/webhooks'

function getOctokit(installationId?: number) {
    return new Octokit({
        auth: {
            id: process.env.GitHubAppId ?? 74711,
            privateKey: process.env.GitHubAppPrivateKey ?? "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0LBhg0U3z+4ikz9J1ycALEpPfLHz3iiEswQWInx+jT8jUQHK\nCY8CU29G16JWRpDw5OLLTvaWAN9vCOXx9AH4YVLzSFn9LunS3bzQP1JFngdl62Mr\nT+XvzEtFapDU44W56bjUVnGDpMGrVDuifrSumEHn15D5bTPOZuiemGlgrvxW/BF1\ncKd98WUiLn0k8EKblimpHQalpLZS3JCBfgmqw2JjLA9IK+3ADnXc5WSWXUuiKj6U\nDtcGmWjZ1bEWRz8cOcc1B2DdkhMsF5bra8Ma3koYAg6HE30fWMnwx+4Wl1co2zoe\nnbonRkfoY9ycxSNx1ruW/I9Bqw4NhtHMNkB1AwIDAQABAoIBAQCvvbmAqIvFyQ7I\n3aU7UJauta2Wnu11ir2lW62gQSL5o9AD6fPQdORKiw0njogFSQ30UqFP0Aymk4KY\nBbzp9bbLjuVdapryJOr03IqqqIgD+srznUHeOQ7mBgVhJrKBIB5eGs6GNXXdC1NS\nzh2bgmD9y5KIUIgcVGJe+0qDo0pOUKDPstbXPgggAr6ws9jw0e0N3OUP+JOKFR5c\nGGCv3Ovu74+zFFonEqE11jhdemNzJwvcjYnOA3qNpwRH3IYyXOxCiJ9yH79h2BZ4\no8TI4433NKlEclj1yCo8v8TeY46T9M/OgJbVF0ml3w//Zb8NsHtjHqFHNhtQGxP5\nV7fhgiNxAoGBAPL7o22cnb8kp9MwpYru/Wj38/Tw/VQXbYY8t8GIk2eV7K10OYBi\ndUmJ4LLQtUNRtRIiJvuKOeqlz7AJW09JC/GM79EwHlMbELEAJNBm44eSO1JI/59p\nl8PdVMJSB4OOYillw9bcltg8LmOO2U0NFTyd20JvDCrMUHWO9/8L18iPAoGBANve\na/pUbaS4x9Dya27Tlgw4p3uA+orhhrGV4TT1tHmnLUywkieCm99DSMH5qEdgeuTO\nnUkbzhR/MSPdt21dA+zT4ASLKgFhQepwyFQ8nhWzcot1Oezi0ux8yymzYK7/jYz5\nWhcnS9FzZA0edeF7hAMXQ/bA2qTFT3cpn6DyEb5NAoGACZ0dNTwKHcL0hO2azylv\ni1SsKVfTnh0jLzl9x8GAm4uaBq7fi43ZuCQlaM3LLjOwZ1xEkJVCf186HWvxWey4\n9UCvSGaP/JfIjEhGLJy1ieqmQDY1Lvh9kblTHjEirPjYN20YV4r4yOtwpm3DeUH4\nQiK4xyMfpx3YXR5f/45XZk8CgYB4wkn1/McXsLF2jp75CNchsUAzshxpiQKsqNA/\ngS/1nR9hPp2Xe8HWtyLP/yowwcndv6ldjRr74PwBYfYr5+mO+rPQawrQJTXJ6NXu\nhjihXKTt+Z2uAMquPsBrD+1rUErTgeS8UMXwrPrnxbIi/O79r5qRfUzZMNG7di4J\nfMrIBQKBgDYKAQn1LWU7houLv4KEuqD18h09pAV08P/t80wB4zfQdE06LI2YQB+d\noqMqxSDrwai+fKYmG0zTsiFHlQ9AGlS2VutrlDGBpmlLyyJFyNaEQDqMk5Nwe34l\ns8hw+gzL81XeHUBi8ZdBu2EDsM3Wo477NkGYgIVhBj4zJO2L9Pkr\n-----END RSA PRIVATE KEY-----\n",
            installationId,
        },
        authStrategy: createAppAuth,
    });
}

const webhooks = new Webhooks({
    secret: process.env.GitHubWebhookSecret ?? "3@4#U8**ku#MXPe6",
});

const constants = {
    autoMergeLabel: 'auto-merge',
    autoSquashLabel: 'auto-squash',
    ready_states: ['clean', 'has_hooks'],
    write_permission: 'write',
    admin_permission: 'admin'
}

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    context.log('HTTP trigger function processed a request.');
    context.log(`Has GitHubAppId: ${process.env.GitHubAppId}`);
    context.log(`Has GitHubAppPrivateKey?: ${!!process.env.GitHubAppPrivateKey}`);
    context.log(`Has GitHubWebhookSecret?: ${!!process.env.GitHubWebhookSecret}`);
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
    if (constants.write_permission != userPermission && constants.admin_permission != userPermission) {
        context.log(`User ${username} does not have permission. Permission: ${userPermission}`)

        if (hasAutoMergeLabel) {
            context.log(`User ${username} removing automerge label: ${userPermission}`)
            await octokit.issues.removeLabel({
                owner: pullRequest.owner,
                repo: pullRequest.repo,
                issue_number: pullRequest.number,
                name: constants.autoMergeLabel,
            })
        }
        if (hasAutoSquashLabel) {
            context.log(
                `User ${username} removing autosquash label: ${userPermission}`
            )
            await octokit.issues.removeLabel({
                owner: pullRequest.owner,
                repo: pullRequest.repo,
                issue_number: pullRequest.number,
                name: constants.autoSquashLabel,
            })
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
