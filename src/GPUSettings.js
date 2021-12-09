// Idk why Discord has to use this
exports.replace = (GPUSettings) => {
  for (const name of Object.keys(GPUSettings)) {
    exports[name] = GPUSettings[name];
  }
};