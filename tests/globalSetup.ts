import { MongoMemoryReplSet } from "mongodb-memory-server";

let replSet: MongoMemoryReplSet | undefined;

export async function setup() {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  const uri = replSet.getUri("bhorsa_test");
  process.env.MONGODB_URI = uri;
  process.env.BETTER_AUTH_SECRET = "test-secret-not-used-for-real-sessions";
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
}

export async function teardown() {
  await replSet?.stop();
}
