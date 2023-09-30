import { deepStrictEqual, strictEqual, notStrictEqual } from "assert";
import * as IPFS from "ipfs-core";
import { rimraf } from "rimraf";

import OrderedKeyValue, {
  OrderedKeyValueDatabaseType,
} from "@/ordered-keyvalue.js";
import config from "./config.js";
import { Identities, Identity, KeyStore, KeyStoreType } from "@orbitdb/core";
import { expect } from "aegir/chai";
import { DBElements } from "@/types.js";

const keysPath = "./testkeys";

describe("OrderedKeyValue Database", () => {
  let ipfs: IPFS.IPFS;
  let identities;
  let keystore: KeyStoreType;
  let testIdentity1: Identity;
  let db: OrderedKeyValueDatabaseType;

  const databaseId = "ordered-keyvalue-AAA";

  before(async () => {
    ipfs = await IPFS.create({ ...config.daemon1, repo: "./ipfs1" });

    keystore = await KeyStore({ path: keysPath });
    identities = await Identities({ keystore });
    testIdentity1 = await identities.createIdentity({ id: "userA" });
  });

  after(async () => {
    if (ipfs) {
      await ipfs.stop();
    }

    if (keystore) {
      await keystore.close();
    }

    await rimraf(keysPath);
    await rimraf("./orbitdb");
    await rimraf("./ipfs1");
  });

  describe("Creating an Ordered KeyValue database", () => {
    beforeEach(async () => {
      db = await OrderedKeyValue()({
        ipfs,
        identity: testIdentity1,
        address: databaseId,
      });
    });

    afterEach(async () => {
      if (db) {
        await db.drop();
        await db.close();
      }
    });

    it("creates an ordered-keyvalue store", async () => {
      strictEqual(db.address.toString(), databaseId);
      strictEqual(db.type, "ordered-keyvalue");
    });

    it("returns 0 items when it's a fresh database", async () => {
      const all = [];
      for await (const item of db.iterator()) {
        all.unshift(item);
      }

      strictEqual(all.length, 0);
    });
  });

  describe("Ordered-keyvalue database API", () => {
    beforeEach(async () => {
      db = await OrderedKeyValue()({
        ipfs,
        identity: testIdentity1,
        address: databaseId,
      });
    });

    afterEach(async () => {
      if (db) {
        await db.drop();
        await db.close();
      }
    });

    it("add a value", async () => {
      const actual = await db.put("key1", "value1");
      expect(actual).to.be.a.not.empty("string");
    });

    it("get a value");

    it("override a key");

    it("del a value", async () => {
      const key = "key1";
      const value = "value1";

      await db.put(key, value);
      await db.del(key);

      const actual = await db.all();
      expect(actual).to.be.an.empty("array");
    });

    it("del and then add a value", async () => {
      const value = "value1";
      const key = "key1";

      await db.put(key, value);
      await db.del(key);
      const hash = await db.put(key, value);

      const actual = await db.all();

      expect(actual).to.have.deep.members([{ value, key, hash }]);
    });

    it("add a value with implicit position");

    it("add a value - negative index");

    it("add a value - index > length");

    it("move a value");

    it("move a value - negative index");

    it("move a value - index > length");

    it("add a value twice, with new position");

    it("returns all values", async () => {
      const keyvalue: {
        value: DBElements;
        key: string;
        position: number;
        hash?: string;
      }[] = [
        {
          key: "key1",
          position: 0,
          value: "init",
        },
        {
          key: "key2",
          position: 1,
          value: true,
        },
        {
          key: "key3",
          position: 2,
          value: "hello",
        },
        {
          key: "key4",
          position: 3,
          value: "friend",
        },
        {
          key: "key5",
          position: 4,
          value: "12345",
        },
        {
          key: "key6",
          position: 5,
          value: "empty",
        },
        {
          key: "key7",
          position: 6,
          value: "friend33",
        },
      ];

      for (const entry of Object.values(keyvalue)) {
        entry.hash = await db.put(entry.key, entry.value, entry.position);
      }

      const all = [];
      for await (const pair of db.iterator()) {
        all.unshift(pair);
      }

      deepStrictEqual(all, keyvalue);
    });
  });

  describe("Iterator", () => {
    before(async () => {
      db = await OrderedKeyValue()({
        ipfs,
        identity: testIdentity1,
        address: databaseId,
      });
    });

    after(async () => {
      if (db) {
        await db.drop();
        await db.close();
      }
    });

    it("has an iterator function", async () => {
      notStrictEqual(db.iterator, undefined);
      strictEqual(typeof db.iterator, "function");
    });

    it("returns no values when the database is empty", async () => {
      const all = [];
      for await (const { hash, value, key } of db.iterator()) {
        all.unshift({ hash, value, key });
      }
      strictEqual(all.length, 0);
    });

    it("returns all values when the database is not empty", async () => {
      await db.put("key1", "value1");
      await db.put("key2", "value2");
      await db.put("key3", "value3");
      await db.put("key4", "value4");
      await db.put("key5", "value5");

      // Add one more value and then delete it to count
      // for the fact that the amount returned should be
      // the amount of actual values returned and not
      // the oplog length, and deleted values don't
      // count towards the returned amount.
      await db.put("key6", "value6");
      await db.del("key6");

      const all = [];
      let position = 0;
      for await (const { hash, value } of db.iterator()) {
        all.unshift({ hash, value, position });
        position++;
      }
      strictEqual(all.length, 5);
    });

    it("returns only the amount of values given as a parameter", async () => {
      const amount = 3;
      const all = [];
      for await (const { hash, value } of db.iterator({ amount })) {
        all.unshift({ hash, value });
      }
      strictEqual(all.length, amount);
    });

    it("returns only two values if amount given as a parameter is 2", async () => {
      const amount = 2;
      const all = [];
      for await (const { hash, value } of db.iterator({ amount })) {
        all.unshift({ hash, value });
      }
      strictEqual(all.length, amount);
    });

    it("returns only one value if amount given as a parameter is 1", async () => {
      const amount = 1;
      const all = [];
      for await (const { hash, value } of db.iterator({ amount })) {
        all.unshift({ hash, value });
      }
      strictEqual(all.length, amount);
    });
  });
});
