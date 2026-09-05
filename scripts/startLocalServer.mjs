import { createServer } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDir = fileURLToPath(new URL('..', import.meta.url));

export async function startLocalServer({ port = 5173 } = {}) {
  const server = await createServer({
    root: projectDir,
    server: { host: 'localhost', port, strictPort: true },
    clearScreen: false,
  });
  try {
    await server.listen();
    return server;
  } catch (error) {
    await server.close();
    throw error;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = await startLocalServer();
  console.log('Loopin is ready at http://localhost:5173');
  const close = async () => {
    await server.close();
    process.exit(0);
  };

  process.once('SIGINT', close);
  process.once('SIGTERM', close);
}
