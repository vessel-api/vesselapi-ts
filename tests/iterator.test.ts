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
