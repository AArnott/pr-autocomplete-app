export default {
	get GitHubAppId(): string {
		return GetDefinedEnvVar("GetHubAppId")
	},
	get GitHubAppPrivateKey(): string {
		return GetDefinedEnvVar("GitHubAppPrivateKey")
	},
	get GitHubWebhookSecret(): string {
		return GetDefinedEnvVar("GitHubWebhookSecret")
	},
}

function GetDefinedEnvVar(name: string): string {
	const value = process.env[name]
	if (value) {
		return value
	} else {
		throw new Error(`No environment variable name ${name} is defined.`)
	}
}
