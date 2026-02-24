export type FetchPage<T> = () => Promise<{ items: T[]; nextToken?: string | null }>;

export class PageIterator<T> implements AsyncIterableIterator<T> {
  private fetchPage: FetchPage<T>;
  private items: T[] = [];
  private index = 0;
  private done = false;
  private started = false;

  constructor(fetchPage: FetchPage<T>) {
    this.fetchPage = fetchPage;
  }

  [Symbol.asyncIterator](): AsyncIterableIterator<T> {
    return this;
  }

  async next(): Promise<IteratorResult<T>> {
    if (this.started) {
      this.index++;
    }
    this.started = true;

    if (this.index < this.items.length) {
      return { value: this.items[this.index]!, done: false };
    }

    if (this.done) {
      return { value: undefined as unknown as T, done: true };
    }

    const page = await this.fetchPage();
    this.items = page.items;
    this.index = 0;

    if (this.items.length === 0) {
      this.done = true;
      return { value: undefined as unknown as T, done: true };
    }

    if (!page.nextToken) {
      this.done = true;
    }

    return { value: this.items[this.index]!, done: false };
  }

  async collect(): Promise<T[]> {
    const result: T[] = [];
    for await (const item of this) {
      result.push(item);
    }
    return result;
  }
}
