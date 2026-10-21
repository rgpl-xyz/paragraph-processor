import { execSync } from "node:child_process";
import { EXTENSION_DIR, REPO_ROOT } from "./paths";
import { startStubApi } from "./stub-api";

// Starts the stub NLP API on a free port and builds the extension against it. Workers
// inherit STUB_API_URL; the returned function stops the stub after the run.
export default async function globalSetup() {
  const api = await startStubApi();
  process.env.STUB_API_URL = api.url;
  try {
    execSync(`npx webpack --mode production --output-path "${EXTENSION_DIR}"`, {
      cwd: REPO_ROOT,
      env: { ...process.env, API_BASE_URL: api.url },
      stdio: "pipe",
    });
  } catch (error) {
    await api.close();
    const output = (error as { stdout?: Buffer }).stdout?.toString() ?? "";
    throw new Error(`Building the extension for e2e failed:\n${output}`);
  }
  return api.close;
}
