import Deta from "deta/dist/types/deta";
import { CompositeType, ObjectType } from "deta/dist/types/types/basic";
import { Account } from "next-auth";
import {
  Adapter,
  AdapterSession,
  AdapterUser,
  VerificationToken,
} from "next-auth/adapters";

const fix = (obj: { [key: string]: any } | null) => {
  if (obj === null) return null;
  obj.id = obj.key;
  const { key, ...newObj } = obj;
  if (!obj.expires || typeof obj.expires !== "string") {
    return newObj;
  }
  const fixedDate = {
    ...newObj,
    expires: new Date(obj.expires),
  };
  return fixedDate;
};

const getBase = <T>(deta: Deta, baseName: string) => {
  const base = {
    db: deta.Base(baseName),
    put: async function (obj: any) {
      obj = await this.db.put(obj);
      return fix(obj) as T;
    },
    get: async function (key: string) {
      return fix(await this.db.get(key)) as T | null;
    },
    update: async function (obj: any, updates: any, key: string) {
      await this.db.update(updates, key);
      return fix({ ...obj, ...updates }) as T;
    },
    delete: async function (key: string) {
      await this.db.delete(key);
    },
    fetch: async function (query: CompositeType) {
      const limit = 1;
      let item = null;
      let res = await this.db.fetch(query, {
        limit,
      });
      if (res.count > 0) {
        item = res.items[0];
      }
      let last = res.last;
      while (last !== undefined) {
        res = await this.db.fetch(query, {
          last,
          limit,
        });
        if (res.count > 0) {
          item = res.items[0];
          break;
        }
        last = res.last;
      }
      return fix(item) as T | null;
    },
  };
  return base;
};

export const DetaAdapter = (deta: Deta): Adapter => {
  const users = getBase<AdapterUser>(deta, "users");
  const accounts = getBase<Account & { id: string }>(deta, "accounts");
  const sessions = getBase<AdapterSession>(deta, "sessions");
  const verificationTokens = getBase<VerificationToken & { id: string }>(
    deta,
    "verificationTokens"
  );

  return {
    async createUser(user) {
      return await users.put(user);
    },
    async getUser(id) {
      return await users.get(id);
    },
    async getUserByEmail(email) {
      const user = await users.fetch({
        email,
      });
      return user;
    },
    async getUserByAccount({ providerAccountId, provider }) {
      const account = await accounts.fetch({
        providerAccountId,
        provider,
      });
      if (account === null) return null;
      return await users.get(account.userId);
    },
    async updateUser(user) {
      const currentUser = await users.get(user.id!);
      await users.update(currentUser, user, user.id!);
      return user as AdapterUser;
    },
    async deleteUser(userId) {
      await users.delete(userId);
    },
    async linkAccount(account) {
      return await accounts.put(account);
    },
    async unlinkAccount({ providerAccountId, provider }) {
      const account = await accounts.fetch({
        providerAccountId,
        provider,
      });
      if (account === null) return;
      await accounts.delete(account.id);
    },
    async createSession({ sessionToken, userId, expires }) {
      const session = await sessions.put({
        sessionToken,
        userId,
        expires,
      });
      return session;
    },
    async getSessionAndUser(sessionToken) {
      const session = await sessions.fetch({
        sessionToken,
      });
      if (session === null) {
        return null;
      }
      const user = await users.get(session.userId);
      if (user === null) {
        return null;
      }
      return { user: user, session: session };
    },
    async updateSession(data) {
      const session = await sessions.fetch({
        sessionToken: data.sessionToken,
      });
      if (session === null) {
        return null;
      }
      return await sessions.update(
        session,
        data as unknown as ObjectType,
        session.id
      );
    },
    async deleteSession(sessionToken) {
      const session = await sessions.fetch({
        sessionToken,
      });
      if (session === null) {
        return;
      }
      await sessions.delete(session.id);
    },
    async createVerificationToken({ identifier, expires, token }) {
      return await verificationTokens.put({
        expires,
        token,
        identifier,
      });
    },
    async useVerificationToken({ identifier, token }) {
      const verificationToken = await verificationTokens.fetch({
        identifier,
        token,
      });
      if (verificationToken === null) {
        return null;
      }
      await verificationTokens.delete(verificationToken.id);
      return verificationToken;
    },
  };
};
