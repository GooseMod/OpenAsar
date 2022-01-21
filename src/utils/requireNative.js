// From Discord to only require native modules like discord_desktop_core
const path = require("path");
const fs = require("fs");
const paths = require("../paths");

module.paths = [];
module.exports = (name) => {
	const modulesPath = path.join(paths.getExeDir(), "modules");
	const folders = fs
		.readdirSync(modulesPath)
		.filter((f) => fs.statSync(path.join(modulesPath, f)).isDirectory());
	for (const folder of folders) {
		if (folder.startsWith(name)) {
			return require(path.join(modulesPath, folder, name));
		}
	}
	throw `Module ${name} not found.`;
};
