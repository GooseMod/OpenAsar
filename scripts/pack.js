const { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } = require('fs');
const { join, resolve } = require('path');
const { spawnSync } = require('child_process');

const root = resolve(__dirname, '..');
const tmpRoot = join(root, 'tmp', 'pack-build');

const args = process.argv.slice(2);
let disableAutoUpdate = false;
let version;
let output = join(root, 'tmp', 'openasar-build', 'app.asar');

for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  if (arg === '--disable-autoupdate') {
    disableAutoUpdate = true;
    continue;
  }

  if (arg === '--version') {
    version = args[++i];
    continue;
  }

  if (arg === '--output') {
    output = resolve(args[++i]);
    continue;
  }

  if (arg === '--help') {
    console.log('Usage: node scripts/pack.js [--disable-autoupdate] [--version <value>] [--output <path>]');
    process.exit(0);
  }

  throw new Error(`Unknown argument: ${arg}`);
}

if (!version) {
  const git = spawnSync('git', ['rev-parse', '--short', 'HEAD'], {
    cwd: root,
    encoding: 'utf8'
  });

  const shortSha = git.status === 0 ? git.stdout.trim() : 'local';
  version = `nightly-${shortSha}`;
}

const stripCode = code => code
  .replace(/(^| )\/\/.*$/gm, '')
  .replaceAll('const ', 'const~')
  .replaceAll('let ', 'let~')
  .replaceAll('var ', 'var~')
  .replaceAll('class ', 'class~')
  .replace(/get [^=}]/g, _ => _.replaceAll(' ', '~'))
  .replaceAll('delete ', 'delete~')
  .replaceAll(' extends ', '~extends~')
  .replaceAll('typeof ', 'typeof~')
  .replaceAll(' of ', '~of~')
  .replaceAll(' in ', '~in~')
  .replaceAll('case ', 'case~')
  .replaceAll('await ', 'await~')
  .replaceAll('new ', 'new~')
  .replaceAll('return ', 'return~')
  .replaceAll('function ', 'function~')
  .replaceAll('void ', 'void~')
  .replaceAll('throw ', 'throw~')
  .replaceAll('async ', 'async~')
  .replaceAll('else ', 'else~')
  .replace('/([0-9]+) files/', '/([0-9]+)~files/')
  .replace(/((['"`])[\s\S]*?\2)|[ \n]/g, (_, g1) => g1 || '')
  .replaceAll('~', ' ')
  .replaceAll('? ?', '??');

const fixHtml = code => code
  .replaceAll(' loop', '~loop')
  .replaceAll(' autoplay', '~autoplay')
  .replaceAll(' src', '~src')
  .replaceAll(' id', '~id');

const stripJs = path => writeFileSync(path, stripCode(readFileSync(path, 'utf8')));
const stripHtml = path => writeFileSync(path, stripCode(fixHtml(readFileSync(path, 'utf8'))));
const stripJson = path => {
  const data = JSON.parse(readFileSync(path, 'utf8'));
  if (data.description) delete data.description;
  writeFileSync(path, JSON.stringify(data));
};

const stripTree = dirPath => readdirSync(dirPath, { withFileTypes: true }).forEach(entry => {
  const path = join(dirPath, entry.name);

  if (entry.isDirectory()) return stripTree(path);
  if (entry.name.endsWith('.js')) return stripJs(path);
  if (entry.name.endsWith('.json')) return stripJson(path);
  if (entry.name.endsWith('.html')) return stripHtml(path);
});

rmSync(tmpRoot, { recursive: true, force: true });
mkdirSync(tmpRoot, { recursive: true });
cpSync(join(root, 'src'), join(tmpRoot, 'src'), { recursive: true });

const indexPath = join(tmpRoot, 'src', 'index.js');
let indexCode = readFileSync(indexPath, 'utf8');
indexCode = indexCode.replace("global.oaVersion = 'nightly';", `global.oaVersion = '${version}';`);
indexCode = indexCode.replace('<disableAutoUpdate>', disableAutoUpdate ? 'true' : 'false');
writeFileSync(indexPath, indexCode);

stripTree(join(tmpRoot, 'src'));

mkdirSync(resolve(output, '..'), { recursive: true });
const asar = spawnSync('asar', ['pack', join(tmpRoot, 'src'), output], {
  cwd: root,
  stdio: 'inherit'
});

if (asar.status !== 0) process.exit(asar.status ?? 1);

if (existsSync(output)) console.log(output);
