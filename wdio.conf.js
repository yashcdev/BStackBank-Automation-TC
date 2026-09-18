// Load .env — works in both launcher and worker processes
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '.env'), override: true });

// Resolve credentials: prefer env vars (CI), fall back to .env values already loaded above
const BS_USER = process.env.BROWSERSTACK_USERNAME;
const BS_KEY = process.env.BROWSERSTACK_ACCESS_KEY;
const platform = process.env.PLATFORM || 'android';
// Supported PLATFORM values: android, androidPixel, androidTablet, ios

if (!BS_USER || !BS_KEY) {
  throw new Error('BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY must be set in .env or environment');
}

// Centralised capability definitions live in config/capabilities.js
const capabilities = require('./config/capabilities');

exports.config = {
  runner: 'local',
  hostname: 'hub-cloud.browserstack.com',
  port: 443,
  protocol: 'https',
  path: '/wd/hub',
  user: BS_USER,
  key: BS_KEY,

  specs: ['./features/**/*.feature'],
  exclude: [],

  maxInstances: 1,

  capabilities: [
    platform === 'ios'
      ? capabilities.ios
      : platform === 'androidPixel'
        ? capabilities.androidPixel
        : capabilities.android,
  ],

  logLevel: 'info',
  bail: 0,
  waitforTimeout: 15000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,

  services: ['browserstack'],

  framework: 'cucumber',
  reporters: ['spec'],

  cucumberOpts: {
    require: ['./step-definitions/**/*.js'],
    backtrace: false,
    requireModule: [],
    dryRun: false,
    failFast: false,
    snippets: true,
    source: true,
    strict: false,
    // Exclude @qrscan from the default run — it requires PLATFORM=androidPixel
    // with enableCameraImageInjection. Run it via: npm run test:qrscan
    tagExpression: platform === 'androidPixel' ? '' : 'not @qrscan',
    timeout: 120000,
    ignoreUndefinedDefinitions: false,
  },
};
