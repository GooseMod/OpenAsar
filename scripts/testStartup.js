const { execFile } = require('child_process');

const test = () => {
  const proc = execFile('xvfb-run', ['-e', '/dev/stdout', process.argv[2], '--enable-logging']);

  let success = false;
  proc.stderr.on('data', (data) => {
    console.error(data.toString());
    if (data.toString().includes('FAST CONNECT')) { // Main window JS running, startup success
      success = true;
      proc.kill();
    }
  });

  data.stdout.on('data', (data) => {
    console.log(data.toString());
  })

  proc.on('close', async () => {
    process.exit(success ? 0 : 1);
  });
};

test();