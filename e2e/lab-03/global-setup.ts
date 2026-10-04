import { execSync } from "node:child_process";

export default async function globalSetup(): Promise<void> {
  // Restore database to documented pristine seed state before running E2E tests,
  // purging any leftover test records from aborted previous runs.
  try {
    execSync("pnpm db:cleanup-e2e", { stdio: "inherit" });
  } catch (error) {
    console.error("Failed to prepare database during E2E globalSetup:", error);
    throw error;
  }
}
