const fs = require("fs");
const { MongoClient } = require("mongodb");

function loadEnvFile(path = ".env") {
  if (!fs.existsSync(path)) return;

  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function databaseNameFromUrl(url) {
  const parsed = new URL(url);
  return decodeURIComponent(parsed.pathname.replace(/^\//, ""));
}

async function main() {
  loadEnvFile();

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is missing");
  }

  const dbName = databaseNameFromUrl(url);
  if (!dbName) {
    throw new Error("DATABASE_URL must include a database name");
  }

  const client = new MongoClient(url, { serverSelectionTimeoutMS: 10000 });
  await client.connect();

  const db = client.db(dbName);
  await db.command({ ping: 1 });
  const collections = await db.listCollections().toArray();

  console.log("MongoDB connection: ok");
  console.log(`Database: ${dbName}`);
  console.log(`Collections: ${collections.length}`);

  await client.close();
}

main().catch((error) => {
  console.error(`MongoDB connection failed: ${error.message}`);
  process.exit(1);
});
