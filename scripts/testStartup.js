const { execFile } = require('child_process');

const test = () => {
  console.log('running...');
  const proc = execFile('xvfb-run', [process.argv[2], '--enable-logging']);

  let success = false;
  let anyOutput = false;
  proc.stderr.on('data', (data) => {
    console.error('stderr', data.toString());
  });

  proc.stdout.on('data', (data) => {
    anyOutput = true;
    console.log('stdout', data.toString());
    if (data.toString().includes('Installing discord_rpc')) {
      success = true;
      setTimeout(() => proc.kill(), 1000);
    }
  });

  proc.on('close', async () => {
    if (!anyOutput) return;
    process.exit(success ? 0 : 1);
  });

  setTimeout(() => {
    if (anyOutput) return;
    console.log('detected no output in 5s, retrying...');
    proc.kill();
  }, 5000);
};

while (true) test();