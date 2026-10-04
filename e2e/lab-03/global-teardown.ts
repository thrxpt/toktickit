import { execSync } from "node:child_process";

export default async function globalTeardown(): Promise<void> {
  // Clean up all residue created by E2E test runs (tickets, comments, notes, throwaway users)
  // and restore seeded reference accounts so the development database returns to pristine state.
  try {
    execSync("pnpm db:cleanup-e2e", { stdio: "inherit" });
  } catch (error) {
    console.error("Failed to cleanup database during E2E globalTeardown:", error);
    // Non-fatal in teardown to allow test reports to generate
  }
}
