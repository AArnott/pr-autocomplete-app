import Inputs from "./inputs"
import { Octokit } from "@octokit/rest"
import { createAppAuth } from "@octokit/auth-app"

export const authInputs: { auth?: string } = {}

export function getOctokit(installationId?: number): Octokit {
	const auth = authInputs ?? {
		auth: {
			id: Inputs.GitHubAppId,
			privateKey: Inputs.GitHubAppPrivateKey.split("\\n").join("\n"), // we use "\n" literals as placeholders for line endings in the Azure Properties
			installationId,
		},
		authStrategy: createAppAuth,
	}

	return new Octokit(auth)
}
