const { execFile } = require('child_process');

const test = () => {
  const proc = execFile('xvfb-run', [process.argv[2], '--enable-logging']);

  let success = false;
  proc.stderr.on('data', (data) => {
    console.error('stderr', data.toString());
  });

  proc.stdout.on('data', (data) => {
    console.log('stdout', data.toString());
    if (data.toString().includes('Installing discord_rpc')) {
      success = true;
      setTimeout(() => proc.kill(), 1000);
    }
  });

  proc.on('close', async () => {
    process.exit(success ? 0 : 1);
  });
};

test();