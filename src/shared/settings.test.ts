import { describe, expect, it, vi } from "vitest";
import { getUseNlp, setUseNlp } from "./settings";

function stubSyncStorage(initial: Record<string, unknown> = {}) {
  let store = { ...initial };
  const sync = {
    get: vi.fn(async (key: string) => (key in store ? { [key]: store[key] } : {})),
    set: vi.fn(async (items: Record<string, unknown>) => {
      store = { ...store, ...items };
    }),
  };
  vi.stubGlobal("chrome", { storage: { sync } });
  return { saved: () => store };
}

describe("Use NLP setting", () => {
  it("is off until the user turns it on", async () => {
    stubSyncStorage();

    await expect(getUseNlp()).resolves.toBe(false);
  });

  it("reads back what was saved", async () => {
    stubSyncStorage();

    await setUseNlp(true);

    await expect(getUseNlp()).resolves.toBe(true);
  });

  it("keeps the storage key existing installs already saved under", async () => {
    const storage = stubSyncStorage({ useNLP: true });

    await expect(getUseNlp()).resolves.toBe(true);
    await setUseNlp(false);
    expect(storage.saved()).toEqual({ useNLP: false });
  });
});
