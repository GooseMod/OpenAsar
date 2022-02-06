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
  .replace(/((['"`])[\s\S]*?\2)|[ \n]/g, (_, g1) => g1 || '')
  .replaceAll('#', ' ')
  .replaceAll('? ?', '??');

const stripFile = (jsPath) => {
  console.log(jsPath);
  fs.writeFileSync(jsPath, stripCode(fs.readFileSync(jsPath, 'utf8')));
};

const tree = (dirPath) => fs.readdirSync(dirPath).forEach((x) => {
  if (x.endsWith('.js')) return stripFile(join(dirPath, x));
  if (!x.includes('.')) return tree(join(dirPath, x));
});

tree(join(__dirname, '..', 'src'));