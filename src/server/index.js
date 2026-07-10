import { createApp } from './app.js';
import { config } from './config.js';
import { createStore } from './store/createStore.js';

const store = createStore({
  persist: process.env.PERSIST !== 'false',
  seedDemo: config.seedDemo
});

const app = createApp({ store });

app.listen(config.port, config.host, () => {
  console.log(`MyCloaker anti-bot router listening on http://${config.host}:${config.port}`);
  console.log(`Data file: ${config.dataFile}`);
  console.log(`Simulate mode: ${config.allowSimulate ? 'enabled' : 'disabled'}`);
  console.log(`Admin auth: ${config.adminToken ? 'enabled' : 'disabled (set ADMIN_TOKEN!)'}`);
});
