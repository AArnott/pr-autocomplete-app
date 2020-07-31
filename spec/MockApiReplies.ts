import fs from "fs"

function ParseMockMessage(name: string): {} {
	return JSON.parse(fs.readFileSync(`${__dirname}/testAssets/${name}`).toString())
}

export const MockReplies = {
	get: {
		permission: {
			admin: ParseMockMessage("api.get.permission.admin.json"),
			read: ParseMockMessage("api.get.permission.read.json"),
			write: ParseMockMessage("api.get.permission.write.json"),
		},
		pr: {
			completed: ParseMockMessage("api.get.pr.completed.json"),
			open_automerge: ParseMockMessage("api.get.pr.open_automerge.json"),
			open_nolabels: ParseMockMessage("api.get.pr.open_nolabels.json"),
		},
	},
}
