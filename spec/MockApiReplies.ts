import fs from "fs"

function ParseMockMessage(name: string): {} {
	return JSON.parse(fs.readFileSync(`${__dirname}/testAssets/${name}`).toString())
}

export const MockReplies = {
	get: {
		pr: {
			completed: ParseMockMessage("api.get.pr.completed.json"),
		},
	},
}
