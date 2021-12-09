const rgb = (r, g, b, text) => `\x1b[38;2;${r};${g};${b}m${text}\x1b[0m`;

module.exports = (area, ...args) => console.log(`[${rgb(88, 101, 242, 'OpenAsar')}${area ? ` > ${area}` : ''}]`, ...args);