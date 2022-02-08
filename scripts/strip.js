const fs = require('fs');
const { join } = require('path');

const stripCode = (code) => code
  .replace(/(^| )\/\/.*$/gm, '')
  .replaceAll('const ', 'const#')
  .replaceAll('let ', 'let#')
  .replaceAll('var ', 'var#')
  .replaceAll('class ', 'class#')
  .replaceAll('get ', 'get#')
  .replaceAll('delete ', 'delete#')
  .replaceAll(' extends ', '#extends#')
  .replaceAll('typeof ', 'typeof#')
  .replaceAll(' of ', '#of#')
  .replaceAll(' in ', '#in#')
  .replaceAll('case ', 'case#')
  .replaceAll('await ', 'await#')
  .replaceAll('new ', 'new#')
  .replaceAll('return ', 'return#')
  .replaceAll('function ', 'function#')
  .replaceAll('void ', 'void#')
  .replaceAll('throw ', 'throw#')
  .replaceAll('async ', 'async#')
  .replaceAll('else ', 'else#')
  .replaceAll('false', '!!0')
  .replaceAll('true', '!0')
  .replace(/((['"`])[\s\S]*?\2)|[ \n]/g, (_, g1) => g1 || '')
  .replaceAll('#', ' ')
  .replaceAll('? ?', '??');

const stripJs = (jsPath) => fs.writeFileSync(jsPath, stripCode(fs.readFileSync(jsPath, 'utf8')));

const minJson = (data) => {
  if (data.description) delete data.description;

  return data;
};

const stripJson = (path) => fs.writeFileSync(path, JSON.stringify(minJson(JSON.parse(fs.readFileSync(path, 'utf8')))));

const tree = (dirPath) => fs.readdirSync(dirPath).forEach((x) => {
  const path = join(dirPath, x);
  console.log(path);

  if (x.endsWith('.js')) return stripJs(path);
  if (x.endsWith('.json')) return stripJson(path);
  if (!x.includes('.')) return tree(path);
});

tree(join(__dirname, '..', 'src'));