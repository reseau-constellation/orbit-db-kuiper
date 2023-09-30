import { useDatabaseType } from "@orbitdb/core";

import Feed from "@/feed.js";
import Set from "@/set.js";
import OrderedKeyValue from "./ordered-keyvalue.js";

export const registerAll = () =>
  [OrderedKeyValue, Feed, Set].forEach(useDatabaseType);
