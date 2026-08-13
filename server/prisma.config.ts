import { defineConfig } from "prisma/config";

// Prisma 7 does not read .env on its own. Node's built-in loader covers it, so
// the project needs no dotenv dependency. Absent .env (CI, or a clone before
// `cp server/.env.example server/.env`), fall through to the real environment.
try {
  process.loadEnvFile(new URL(".env", import.meta.url));
} catch {
  // no .env file — DATABASE_URL must already be exported
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
