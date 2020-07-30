export default {
	GitHubAppId: GetDefinedEnvVar("GetHubAppId"),
	GitHubAppPrivateKey: GetDefinedEnvVar("GitHubAppPrivateKey"),
	GitHubWebhookSecret: GetDefinedEnvVar("GitHubWebhookSecret"),
}

function GetDefinedEnvVar(name: string): string {
	const value = process.env[name]
	if (value) {
		return value
	} else {
		throw new Error(`No environment variable name ${name} is defined.`)
	}
}
