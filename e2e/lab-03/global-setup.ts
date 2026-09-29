import { execSync } from "node:child_process";

export default async function globalSetup(): Promise<void> {
  // Re-seed the development database before E2E tests to ensure
  // deterministic user accounts, passwords, and reference data.
  try {
    execSync("pnpm --filter server db:seed", { stdio: "inherit" });
  } catch (error) {
    console.error("Failed to seed database during E2E globalSetup:", error);
    throw error;
  }
}
