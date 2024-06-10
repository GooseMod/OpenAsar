const { app } = require('electron');

const presets = {
  'base': '--autoplay-policy=no-user-gesture-required --disable-features=WinRetrieveSuggestionsOnlyOnDemand,HardwareMediaKeyHandling,MediaSessionService', // Base Discord
  'perf': `--enable-gpu-rasterization --enable-zero-copy --ignore-gpu-blocklist --enable-hardware-overlays=single-fullscreen,single-on-top,underlay --enable-features=EnableDrDc,CanvasOopRasterization,BackForwardCache:TimeToLiveInBackForwardCacheInSeconds/300/should_ignore_blocklists/true/enable_same_site/true,ThrottleDisplayNoneAndVisibilityHiddenCrossOriginIframes,UseSkiaRenderer,WebAssemblyLazyCompilation --enable-experimental-webassembly-features --disable-low-end-device-mode --v8-cache-options=code --disable-features=Vulkan --force_high_performance_gpu --disable-v8-idle-tasks`, // Performance
  'battery': '--enable-features=TurnOffStreamingMediaCachingOnBattery --enable-low-end-device-mode --force_low_power_gpu --disable-renderer-backgrounding --disable-smooth-scrolling' // Known to have better battery life for Chromium?
};


module.exports = () => {
  let c = {};
  for (const x of ('base,' + (oaConfig.cmdPreset || 'perf')).split(',').reduce((a, x) => a.concat(presets[x]?.split(' ')), (oaConfig.customFlags ?? '').split(' '))) {
    if (!x) continue;
    const [ k, v ] = x.split('=');

    (c[k] = c[k] || []).push(v);
  }

  for (const k in c) {
    app.commandLine.appendSwitch(k.replace('--', ''), c[k].join(','));
  }
};
