import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { Webhooks } from '@octokit/webhooks'
const webhooks = new Webhooks({
    secret: process.env.GitHubWebhookSecret,
});

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    context.log('HTTP trigger function processed a request.');
    context.log(`Event type: ${ req.headers['X-GitHub-Event'] }`)

    webhooks.on('check_run.completed', evt => {
        context.log('check_run.completed');
        context.log(JSON.stringify(evt))
    })

    webhooks.on('pull_request.synchronize', evt => {
        context.log('pull_request.synchronize');
        context.log(JSON.stringify(evt))
    })

    webhooks.on('check_suite.completed', evt => {
        context.log('check_suite.completed');
        context.log(JSON.stringify(evt))
        const pullRequests = evt.payload.check_suite.pull_requests
    })

    // parse pull request event
    webhooks.on("pull_request.opened", (evt) => {
        context.log('pull_request.opened')
        context.log(JSON.stringify(evt))
    })

    await webhooks.verifyAndReceive({
        id: context.req.headers['X-GitHub-Delivery'],
        name: context.req.headers['X-GitHub-Event'],
        payload: context.req.body,
        signature: context.req.headers['HTTP_X_HUB_SIGNATURE'],
    });
};

export default httpTrigger;
