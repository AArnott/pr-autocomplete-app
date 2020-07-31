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
			open_automerge_clean: ParseMockMessage("api.get.pr.open_automerge_clean.json"),
			open_automerge_unstable: ParseMockMessage("api.get.pr.open_automerge_unstable.json"),
			open_nolabels: ParseMockMessage("api.get.pr.open_nolabels.json"),
			reviews: {
				oneApproved: ParseMockMessage("api.get.pr.reviews.oneApproved.json"),
				oneApproved_oneChanges: ParseMockMessage("api.get.pr.reviews.oneApproved_oneChanges.json"),
			},
		},
	},
}
