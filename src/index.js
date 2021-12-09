const log = require('./utils/log');
global.log = log; // Make log global for easy usage everywhere

log('', 'Initing...');

const bootstrap = require('./bootstrap');

bootstrap(); // Start bootstrap