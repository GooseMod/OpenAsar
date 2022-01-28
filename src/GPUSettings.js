exports.replace = (GPUSettings) => {
  for (const name in GPUSettings) {
    exports[name] = GPUSettings[name];
  }
};