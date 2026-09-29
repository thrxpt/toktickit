import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("STYLE-01 — Zen Green color tokens and absence of external hex codes (ui-spec §1)", () => {
  const themeCssPath = path.resolve(
    __dirname,
    "../../../src/styles/theme.css",
  );

  it("declares all required Zen Green color tokens on :root in theme.css", () => {
    expect(fs.existsSync(themeCssPath)).toBe(true);
    const themeContent = fs.readFileSync(themeCssPath, "utf-8");

    const requiredTokens = [
      "--zen-primary",
      "--zen-secondary",
      "--zen-pale",
      "--zen-page-bg",
      "--zen-surface",
      "--zen-border",
      "--zen-text",
      "--zen-text-muted",
      "--zen-readonly-bg",
      "--zen-danger",
      "--zen-danger-bg",
      "--zen-warning",
      "--zen-warning-bg",
      "--zen-info",
      "--zen-info-bg",
      "--zen-admin",
      "--zen-admin-bg",
    ];

    for (const token of requiredTokens) {
      expect(themeContent).toContain(token);
    }
  });

  it("ensures no arbitrary hex color codes exist in client source files outside theme.css", () => {
    const srcDir = path.resolve(__dirname, "../../../src");

    function findSourceFiles(dir: string): string[] {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const files: string[] = [];
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...findSourceFiles(fullPath));
        } else if (
          (entry.name.endsWith(".tsx") ||
            entry.name.endsWith(".ts") ||
            entry.name.endsWith(".css")) &&
          !fullPath.endsWith("theme.css")
        ) {
          files.push(fullPath);
        }
      }
      return files;
    }

    const sourceFiles = findSourceFiles(srcDir);
    expect(sourceFiles.length).toBeGreaterThan(0);

    const hexColorRegex = /#(?:[0-9a-fA-F]{3,4}){1,2}\b/g;

    const filesWithHex: { file: string; matches: string[] }[] = [];
    for (const filePath of sourceFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      const matches = content.match(hexColorRegex);
      if (matches && matches.length > 0) {
        filesWithHex.push({
          file: path.relative(srcDir, filePath),
          matches,
        });
      }
    }

    expect(filesWithHex).toEqual([]);
  });
});
