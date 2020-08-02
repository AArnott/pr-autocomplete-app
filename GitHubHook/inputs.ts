export default {
	get GitHubAppId(): number {
		return Number.parseInt(GetDefinedEnvVar("GitHubAppId"))
	},
	get GitHubAppPrivateKey(): string {
		// We use "\n" literals as placeholders for line endings in the Azure Properties.
		return GetDefinedEnvVar("GitHubAppPrivateKey").split("\\n").join("\n")
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
