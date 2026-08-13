import { describe, expect, it } from "vitest";
import { PageIterator } from "../src/iterator.js";

describe("PageIterator", () => {
  it("iterates over a single page", async () => {
    const iter = new PageIterator<number>(async () => ({
      items: [1, 2, 3],
      nextToken: null,
    }));

    const result: number[] = [];
    for await (const item of iter) {
      result.push(item);
    }
    expect(result).toEqual([1, 2, 3]);
  });

  it("iterates over multiple pages", async () => {
    let page = 0;
    const pages = [
      { items: [1, 2], nextToken: "token1" },
      { items: [3, 4], nextToken: "token2" },
      { items: [5], nextToken: null },
    ];

    const iter = new PageIterator<number>(async () => {
      const p = pages[page++]!;
      return p;
    });

    const result: number[] = [];
    for await (const item of iter) {
      result.push(item);
    }
    expect(result).toEqual([1, 2, 3, 4, 5]);
  });

  it("handles empty results", async () => {
    const iter = new PageIterator<number>(async () => ({
      items: [],
      nextToken: null,
    }));

    const result: number[] = [];
    for await (const item of iter) {
      result.push(item);
    }
    expect(result).toEqual([]);
  });

  it("collect() returns all items as array", async () => {
    let page = 0;
    const pages = [
      { items: [1, 2], nextToken: "t" },
      { items: [3], nextToken: null },
    ];
    const iter = new PageIterator<number>(async () => pages[page++]!);

    const result = await iter.collect();
    expect(result).toEqual([1, 2, 3]);
  });

  it("propagates errors from fetch", async () => {
    const iter = new PageIterator<number>(async () => {
      throw new Error("fetch failed");
    });

    await expect(iter.collect()).rejects.toThrow("fetch failed");
  });

  it("stops when nextToken is undefined", async () => {
    let calls = 0;
    const iter = new PageIterator<number>(async () => {
      calls++;
      return { items: [1], nextToken: undefined };
    });

    const result = await iter.collect();
    expect(result).toEqual([1]);
    expect(calls).toBe(1);
  });
});

describe("PageIterator empty-page handling", () => {
  it("keeps paging past an empty page that still carries a nextToken", async () => {
    // The service can return a page with no items while more pages remain, for
    // example when rows are dropped during assembly. Stopping there would
    // silently truncate the results with no error.
    const pages = [
      { items: [1, 2], nextToken: "a" },
      { items: [], nextToken: "b" },
      { items: [3, 4], nextToken: null },
    ];
    let fetched = 0;
    const iter = new PageIterator<number>(async () => pages[fetched++]!);

    expect(await iter.collect()).toEqual([1, 2, 3, 4]);
    expect(fetched).toBe(3);
  });

  it("stops on an empty page with no nextToken", async () => {
    let fetched = 0;
    const iter = new PageIterator<number>(async () => {
      fetched++;
      return { items: [], nextToken: null };
    });

    expect(await iter.collect()).toEqual([]);
    expect(fetched).toBe(1);
  });

  it("tolerates several consecutive empty pages", async () => {
    const pages = [
      { items: [], nextToken: "a" },
      { items: [], nextToken: "b" },
      { items: [7], nextToken: null },
    ];
    let fetched = 0;
    const iter = new PageIterator<number>(async () => pages[fetched++]!);

    expect(await iter.collect()).toEqual([7]);
    expect(fetched).toBe(3);
  });
});
