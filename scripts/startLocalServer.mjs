import { createServer } from 'vite';

const server = await createServer({
  server: { host: 'localhost', port: 5173, strictPort: true },
  clearScreen: false,
});

await server.listen();
console.log('Loopin is ready at http://localhost:5173');

const close = async () => {
  await server.close();
  process.exit(0);
};

process.once('SIGINT', close);
process.once('SIGTERM', close);
