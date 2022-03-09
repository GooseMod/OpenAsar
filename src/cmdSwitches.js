const { app } = require('electron');

const presets = {
  'base': '--autoplay-policy=no-user-gesture-required --disable-features=WinRetrieveSuggestionsOnlyOnDemand,HardwareMediaKeyHandling,MediaSessionService', // Base Discord
  'perf': `--enable-gpu-rasterization --enable-zero-copy --ignore-gpu-blocklist --enable-hardware-overlays=single-fullscreen,single-on-top,underlay --enable-features=EnableDrDc,CanvasOopRasterization,BackForwardCache:TimeToLiveInBackForwardCacheInSeconds/300/should_ignore_blocklists/true/enable_same_site/true,ThrottleDisplayNoneAndVisibilityHiddenCrossOriginIframes,UseSkiaRenderer,WebAssemblyLazyCompilation --disable-features=Vulkan --force_high_performance_gpu`, // Performance
  'battery': '--enable-features=TurnOffStreamingMediaCachingOnBattery --force_low_power_gpu' // Known to have better battery life for Chromium?
};

const combinePresets = (...keys) => Object.values(keys.reduce((acc, x) => {
  for (const cmd of presets[x].split(' ')) {
    if (!cmd) continue;

    const [ key, value ] = cmd.split('=');

    if (!acc[key]) acc[key] = [key];
    acc[key].push(value);
  }

  return acc;
}, {}));


module.exports = () => {
  for (const [ key, ...values ] of combinePresets('base', ...(oaConfig.cmdPreset || 'perf').split(','))) {
    app.commandLine.appendSwitch(key.replace('--', ''), values.join(','));
  }
}
