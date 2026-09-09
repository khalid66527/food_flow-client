import "@/lib/setup-dns";
import { MongoClient, Db } from "mongodb";

const mongodbUri = process.env.MONGODB_URI;

if (!mongodbUri) {
  throw new Error("MONGODB_URI is not defined in environment variables");
}

let client: MongoClient;
let db: Db;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(mongodbUri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(mongodbUri);
  clientPromise = client.connect();
}

export async function getDb(): Promise<Db> {
  const connectedClient = await clientPromise;
  const dbName = process.env.DB_NAME || "food-delivery-platform";
  return connectedClient.db(dbName);
}

export async function getOrdersCollection() {
  const database = await getDb();
  return database.collection("orders");
}

export async function getCartCollection() {
  const database = await getDb();
  return database.collection("cart");
}

export async function getSettingsCollection() {
  const database = await getDb();
  return database.collection("platform_settings");
}

export async function getCouponsCollection() {
  const database = await getDb();
  return database.collection("coupons");
}
