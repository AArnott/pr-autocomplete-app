import Inputs from "./inputs"
import { Octokit } from "@octokit/rest"
import { createAppAuth } from "@octokit/auth-app"

export const authInputs: { auth?: string } = {}

export async function getOctokit(installationId?: number): Promise<Octokit> {
	if (authInputs.auth) {
		return new Octokit(authInputs)
	}

	const auth = createAppAuth({
		id: Inputs.GitHubAppId,
		privateKey: Inputs.GitHubAppPrivateKey,
	})

	const authentication = await auth({ type: "installation", installationId })
	const octokit = new Octokit({ auth: authentication.token })
	return octokit
}
