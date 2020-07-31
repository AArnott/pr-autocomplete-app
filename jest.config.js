module.exports = {
	transform: {
		"^.+\\.tsx?$": "ts-jest",
	},
	testRegex: "\\.(test|spec)\\.ts$",
	moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
	collectCoverage: true,
}
