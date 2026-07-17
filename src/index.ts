import { loadConfig } from './config.js';
import { startHttpServer } from './http.js';

const config = loadConfig();
const server = startHttpServer(config);

function shutdown(signal: string): void {
  console.log(`Received ${signal}; shutting down Wiplash MCP.`);
  server.close((error) => {
    if (error) {
      console.error('MCP shutdown failed', { error: error.name });
      process.exitCode = 1;
    }
  });
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

export { createHttpApp, startHttpServer } from './http.js';
export { createWiplashMcpServer } from './server.js';
export { WiplashClient } from './wiplash-client.js';
export { KeycloakAccessTokenVerifier, protectedResourceMetadataUrl } from './oauth.js';
