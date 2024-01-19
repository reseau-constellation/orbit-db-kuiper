import {
  type AccessController,
  Database,
  type Identity,
  type Storage,
} from "@orbitdb/core";
import type { Helia } from "helia";

const type = "feed" as const;

export type FeedDatabaseType = Awaited<ReturnType<ReturnType<typeof Feed>>>;

const Feed =
  () =>
  async ({
    ipfs,
    identity,
    address,
    name,
    access,
    directory,
    meta,
    headsStorage,
    entryStorage,
    indexStorage,
    referencesCount,
    syncAutomatically,
    onUpdate,
  }: {
    ipfs: Helia;
    identity?: Identity;
    address: string;
    name?: string;
    access?: AccessController;
    directory?: string;
    meta?: object;
    headsStorage?: Storage;
    entryStorage?: Storage;
    indexStorage?: Storage;
    referencesCount?: number;
    syncAutomatically?: boolean;
    onUpdate?: () => void;
  }) => {
    const database = await Database({
      ipfs,
      identity,
      address,
      name,
      access,
      directory,
      meta,
      headsStorage,
      entryStorage,
      indexStorage,
      referencesCount,
      syncAutomatically,
      onUpdate,
    });

    const { addOperation, log } = database;

    const add = async (value: unknown): Promise<string> => {
      return addOperation({ op: "ADD", key: null, value });
    };

    const remove = async (hash: string): Promise<string> => {
      return addOperation({ op: "DEL", key: null, value: hash });
    };

    const iterator = async function* ({
      amount,
    }: { amount?: number } = {}): AsyncGenerator<
      {
        value: unknown;
        hash: string;
      },
      void,
      unknown
    > {
      const vals: { [val: string]: boolean } = {};
      let count = 0;
      for await (const entry of log.traverse()) {
        const { op, value } = entry.payload;
        const { hash } = entry;

        if (op === "ADD" && !vals[hash]) {
          count++;
          const hash = entry.hash;
          vals[hash] = true;
          yield { value, hash };
        } else if (op === "DEL" && !vals[value as string]) {
          vals[value as string] = true;
        }
        if (amount !== undefined && count >= amount) {
          break;
        }
      }
    };

    const all = async (): Promise<
      {
        value: unknown;
        hash: string;
      }[]
    > => {
      const values = [];
      for await (const entry of iterator()) {
        values.unshift(entry);
      }
      return values;
    };

    return {
      ...database,
      type,
      add,
      remove,
      iterator,
      all,
    };
  };

Feed.type = type;

export default Feed;
