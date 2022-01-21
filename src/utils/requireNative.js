// From Discord to only require native modules like discord_desktop_core
const path = require("path");
const Module = require("module");

module.paths = [];
module.exports = (name) => {
	const mod = Module.globalPaths.find((p) => p.includes(name));
	if (mod) return require(path.join(mod, name));
	throw `Module ${name} not found.`;
};
