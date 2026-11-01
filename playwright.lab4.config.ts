import base from "./playwright.config";
import { defineConfig } from "@playwright/test";
export default defineConfig({ ...base, testDir: "./e2e/lab-04" });
