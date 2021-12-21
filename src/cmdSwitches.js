const { app } = require('electron');

const presets = {
  'perf': `--enable-gpu-rasterization --enable-zero-copy --ignore-gpu-blocklist --enable-hardware-overlays=single-fullscreen,single-on-top,underlay --enable-features=BackForwardCache:TimeToLiveInBackForwardCacheInSeconds/300/should_ignore_blocklists/true/enable_same_site/true,ThrottleDisplayNoneAndVisibilityHiddenCrossOriginIframes,UseSkiaRenderer,WebAssemblyLazyCompilation --disable-features=Vulkan`, // Performance
  'perf-ex': '--enable-quic --enable-features=EnableDrDc,CanvasOopRasterization', // Performance experimental (not known / tested benefit)
  'disablemediakeys': '--disable-features=HardwareMediaKeyHandling', // Disables media keys (common want)
  'battery': '--enable-features=TurnOffStreamingMediaCachingAlways' // Known to have better battery life for Chromium
};

module.exports = () => {
  const preset = oaConfig.cmdPreset || 'perf,perf-ex,battery'; // Default to most (should default to none?)
  let cmdSwitches = presets[preset] || ''; // Default to blank (no switches)

  log('CmdSwitches', 'Preset:', preset);

  if (preset.includes(',')) {
    let total = {};
    for (const pre of preset.split(',')) {
      for (const cmd of presets[pre].split(' ')) {
        const [ key, value ] = cmd.split('=');

        if (total[key]) {
          if (value) {
            total[key] += ',' + value; // Concat value with , for flags like --enable-features
          } // Else no value, ignore as it already exists
        } else {
          total[key] = value;
        }
      }
    }

    console.log(total);

    cmdSwitches = Object.keys(total).reduce((acc, x) => acc += (x + (total[x] ? ('=' + total[x]) : '') + ' '), '');
  }

  if (cmdSwitches) {
    cmdSwitches = `--flag-switches-begin ` + cmdSwitches + ` --flag-switches-end`; // Probably unneeded for Chromium / Electron manual flags but add anyway

    log('CmdSwitches', 'Switches:', cmdSwitches);

    const switches = cmdSwitches.split(' ');

    for (const cmd of switches) {
      const [ key, value ] = cmd.split('=');

      app.commandLine.appendSwitch(key, value);
      log('CmdSwitches', 'Appended switch', key, value);
    }
  }
}