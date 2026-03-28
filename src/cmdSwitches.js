const { join } = require('path');
const { app } = require('electron');

const paths = require('./paths');

const presets = {
  'base': '--autoplay-policy=no-user-gesture-required --disable-features=WinRetrieveSuggestionsOnlyOnDemand,HardwareMediaKeyHandling,MediaSessionService,UseEcoQoSForBackgroundProcess,IntensiveWakeUpThrottling,AllowAggressiveThrottlingWithWebSocket --disable-background-timer-throttling', // Base Discord
  'perf': `--enable-gpu-rasterization --enable-zero-copy --ignore-gpu-blocklist --enable-hardware-overlays=single-fullscreen,single-on-top,underlay --enable-features=EnableDrDc,CanvasOopRasterization,BackForwardCache:TimeToLiveInBackForwardCacheInSeconds/300/should_ignore_blocklists/true/enable_same_site/true,ThrottleDisplayNoneAndVisibilityHiddenCrossOriginIframes,UseSkiaRenderer,WebAssemblyLazyCompilation --disable-features=Vulkan --force_high_performance_gpu`, // Performance
  'battery': '--enable-features=TurnOffStreamingMediaCachingOnBattery --force_low_power_gpu' // Known to have better battery life for Chromium?
};

module.exports = () => {
  const flags = ('base,' + (oaConfig.cmdPreset || 'perf')).split(',').reduce((a, x) => a.concat(presets[x]?.split(' ')), (oaConfig.customFlags ?? '').split(' '));
  if (process.platform === 'linux' && settings.get('openH264Enabled', true))
    flags.push('--enable-libopenh264', '--openh264-library-path=' + join(paths.getAssetCachePath(), 'openh264', 'libopenh264-2.5.1-linux64.7.so'));

  let c = {};
  for (const x of flags) {
    if (!x) continue;
    const [ k, v ] = x.split('=');

    (c[k] = c[k] || []).push(v);
  }

  for (const k in c) {
    app.commandLine.appendSwitch(k.replace('--', ''), c[k].join(','));
  }
};
