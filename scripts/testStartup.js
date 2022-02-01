const { execFile } = require('child_process');

const test = () => {
  const proc = execFile(process.argv[2], ['--enable-logging']);

  let success = false;
  proc.stderr.on('data', (data) => {
    if (data.toString().includes('FAST CONNECT')) { // Main window JS running, startup success
      success = true;
      proc.kill();
    }
  });

  proc.on('close', async () => {
    process.exit(success ? 0 : 1);
  });
};

test();