import { randomUUID } from "crypto";

type AnyRecord = Record<string, unknown>;
type Store = Record<string, AnyRecord[]>;

const globalStore = globalThis as typeof globalThis & {
  __colqadInMemoryDb__?: Store;
};

const store: Store = globalStore.__colqadInMemoryDb__ ?? {};
if (!globalStore.__colqadInMemoryDb__) {
  globalStore.__colqadInMemoryDb__ = store;
}

function ensureModel(model: string): AnyRecord[] {
  if (!store[model]) store[model] = [];
  return store[model];
}

function generateId() {
  return randomUUID();
}

function normalizeComparable(value: unknown): number | string {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const asDate = Date.parse(value);
    return Number.isNaN(asDate) ? value : asDate;
  }
  return "";
}

function matchesWhere(record: AnyRecord, where: AnyRecord | undefined): boolean {
  if (!where) return true;

  if (Array.isArray(where.AND)) {
    return where.AND.every((clause: AnyRecord) => matchesWhere(record, clause));
  }
  if (Array.isArray(where.OR)) {
    return where.OR.some((clause: AnyRecord) => matchesWhere(record, clause));
  }

  return Object.entries(where).every(([key, condition]) => {
    if (key === "AND" || key === "OR") return true;

    if (condition && typeof condition === "object" && !Array.isArray(condition)) {
      const cond = condition as AnyRecord;

      if ("equals" in cond) return record[key] === cond.equals;
      if ("in" in cond && Array.isArray(cond.in)) return cond.in.includes(record[key]);
      if ("gt" in cond) return normalizeComparable(record[key]) > normalizeComparable(cond.gt);
      if ("gte" in cond) return normalizeComparable(record[key]) >= normalizeComparable(cond.gte);
      if ("lt" in cond) return normalizeComparable(record[key]) < normalizeComparable(cond.lt);
      if ("lte" in cond) return normalizeComparable(record[key]) <= normalizeComparable(cond.lte);

      if (
        key.includes("_") &&
        Object.keys(cond).length > 0 &&
        Object.keys(cond).every((nestedKey) => Object.prototype.hasOwnProperty.call(record, nestedKey))
      ) {
        return Object.entries(cond).every(([nestedKey, nestedVal]) =>
          Object.prototype.hasOwnProperty.call(record, nestedKey)
            ? record[nestedKey] === nestedVal
            : false
        );
      }

      return matchesWhere((record[key] ?? {}) as AnyRecord, cond);
    }

    return record[key] === condition;
  });
}

function sortRecords(records: AnyRecord[], orderBy: AnyRecord | AnyRecord[] | undefined): AnyRecord[] {
  if (!orderBy) return records;
  const clauses = Array.isArray(orderBy) ? orderBy : [orderBy];
  return [...records].sort((a, b) => {
    for (const clause of clauses) {
      const [key, direction] = Object.entries(clause)[0];
      const av = normalizeComparable(a[key]);
      const bv = normalizeComparable(b[key]);
      if (av === bv) continue;
      const asc = direction === "asc" || direction === "ASC";
      return asc ? (av > bv ? 1 : -1) : av > bv ? -1 : 1;
    }
    return 0;
  });
}

function applySelect(record: AnyRecord, select: AnyRecord | undefined): AnyRecord {
  if (!select) return record;
  const out: AnyRecord = {};
  for (const [key, enabled] of Object.entries(select)) {
    if (enabled) out[key] = record[key];
  }
  return out;
}

function withIncludes(model: string, record: AnyRecord, include: AnyRecord | undefined): AnyRecord {
  if (!include) return record;

  const out: AnyRecord = { ...record };

  if (model === "chatSession" && include.messages) {
    const messageRows = ensureModel("chatMessage").filter((row) => row.sessionId === record.id);
    const messagesCfg = include.messages && typeof include.messages === "object" && "orderBy" in include.messages ? include.messages as AnyRecord : undefined;
    const msgOrderBy = messagesCfg?.orderBy as AnyRecord | AnyRecord[] | undefined;
    out.messages = sortRecords(messageRows, msgOrderBy);
  }

  if (model === "topic") {
    if (include.children) {
      const children = ensureModel("topic").filter((row) => row.parentId === record.id);
      const childCfg = typeof include.children === "object" && "include" in include.children ? include.children as AnyRecord : undefined;
      const childInclude = childCfg?.include as AnyRecord | undefined;
      out.children = children.map((child) => withIncludes("topic", child, childInclude));
    }
    if (include.problems) {
      out.problems = ensureModel("problem").filter((row) => row.topicId === record.id);
    }
  }

  return out;
}

function modelDelegate(model: string) {
  const rows = ensureModel(model);

  return {
    findMany: async (args: AnyRecord = {}) => {
      const where = args.where as AnyRecord | undefined;
      const orderBy = args.orderBy as AnyRecord | AnyRecord[] | undefined;
      const include = args.include as AnyRecord | undefined;
      const select = args.select as AnyRecord | undefined;
      const filtered = rows.filter((row) => matchesWhere(row, where));
      const sorted = sortRecords(filtered, orderBy);
      return sorted.map((row) => applySelect(withIncludes(model, row, include), select));
    },

    findFirst: async (args: AnyRecord = {}) => {
      const list = await modelDelegate(model).findMany(args);
      return list[0] ?? null;
    },

    findUnique: async (args: AnyRecord = {}) => {
      const list = await modelDelegate(model).findMany({
        where: args.where as AnyRecord | undefined,
        include: args.include as AnyRecord | undefined,
        select: args.select as AnyRecord | undefined,
      });
      return list[0] ?? null;
    },

    create: async (args: AnyRecord = {}) => {
      const data = { ...(args.data as AnyRecord | undefined) };
      const now = new Date();
      const created = {
        id: data.id ?? generateId(),
        createdAt: data.createdAt ?? now,
        updatedAt: data.updatedAt ?? now,
        ...data,
      };
      rows.push(created);
      const withIncluded = withIncludes(model, created, args.include as AnyRecord | undefined);
      return applySelect(withIncluded, args.select as AnyRecord | undefined);
    },

    createMany: async (args: AnyRecord = {}) => {
      const dataList = Array.isArray(args.data) ? args.data : [];
      dataList.forEach((item) => {
        rows.push({ id: item.id ?? generateId(), createdAt: item.createdAt ?? new Date(), ...item });
      });
      return { count: dataList.length };
    },

    update: async (args: AnyRecord = {}) => {
      const idx = rows.findIndex((row) => matchesWhere(row, args.where as AnyRecord | undefined));
      if (idx === -1) throw new Error(`${model}.update: record not found`);
      const current = rows[idx];
      const updateData = { ...(args.data as AnyRecord | undefined) };

      Object.entries(updateData).forEach(([key, value]) => {
        if (value && typeof value === "object" && "increment" in (value as AnyRecord)) {
          const incrementBy = Number((value as AnyRecord).increment ?? 0);
          current[key] = Number(current[key] ?? 0) + incrementBy;
        } else {
          current[key] = value;
        }
      });

      current.updatedAt = new Date();
      rows[idx] = current;
      return applySelect(
        withIncludes(model, current, args.include as AnyRecord | undefined),
        args.select as AnyRecord | undefined
      );
    },

    upsert: async (args: AnyRecord = {}) => {
      const existing = await modelDelegate(model).findUnique({ where: args.where });
      if (existing) {
        return modelDelegate(model).update({ where: args.where, data: args.update, include: args.include, select: args.select });
      }
      return modelDelegate(model).create({ data: args.create, include: args.include, select: args.select });
    },

    delete: async (args: AnyRecord = {}) => {
      const idx = rows.findIndex((row) => matchesWhere(row, args.where as AnyRecord | undefined));
      if (idx === -1) throw new Error(`${model}.delete: record not found`);
      const [deleted] = rows.splice(idx, 1);
      return deleted;
    },

    count: async (args: AnyRecord = {}) => {
      return rows.filter((row) => matchesWhere(row, args.where as AnyRecord | undefined)).length;
    },

    groupBy: async () => {
      return [];
    },
  };
}

export const db = new Proxy(
  {
    // NOTE: Temporary stabilization fallback; replace with a persistent transactional datastore in follow-up hardening.
    $transaction: async (input: unknown) => {
      if (typeof input === "function") {
        return (input as (client: typeof db) => unknown)(db);
      }
      if (Array.isArray(input)) {
        return Promise.all(input);
      }
      return input;
    },
    $disconnect: async () => {},
  } as AnyRecord,
  {
    get(target, prop, receiver) {
      if (typeof prop === "string" && prop in target) {
        return Reflect.get(target, prop, receiver);
      }
      if (typeof prop === "string") {
        return modelDelegate(prop);
      }
      return undefined;
    },
  }
);
