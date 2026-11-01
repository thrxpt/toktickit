import { once } from "node:events";
import { afterAll, beforeAll } from "vitest";
import app from "../../src/app";

// Supertest otherwise opens/closes a listener for every request. Reusing one per
// file avoids keep-alive/ephemeral-port races while exercising the same HTTP app.
const server = app.listen(0);
beforeAll(async () => {
  if (!server.listening) await once(server, "listening");
});
afterAll(() => new Promise<void>((resolve, reject) => {
  server.close(error => error ? reject(error) : resolve());
}));
export default server;
