import "@/lib/setup-dns";
import { MongoClient, Db } from "mongodb";

const mongodbUri = process.env.MONGODB_URI;

if (!mongodbUri) {
  throw new Error("MONGODB_URI is not defined in environment variables");
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoDbClientPromise: Promise<MongoClient> | undefined;
}

function createClientPromise(): Promise<MongoClient> {
  const client = new MongoClient(mongodbUri as string, {
    serverSelectionTimeoutMS: 8000,
  });
  return client.connect().catch((err) => {
    delete global._mongoDbClientPromise;
    throw err;
  });
}

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  if (!global._mongoDbClientPromise) {
    global._mongoDbClientPromise = createClientPromise();
  }
  clientPromise = global._mongoDbClientPromise;
} else {
  clientPromise = createClientPromise();
}

export async function getDb(): Promise<Db> {
  const dbName = process.env.DB_NAME || "food-delivery-platform";
  try {
    const connectedClient = await clientPromise;
    return connectedClient.db(dbName);
  } catch (err) {
    delete global._mongoDbClientPromise;
    const retryClient = await createClientPromise();
    global._mongoDbClientPromise = Promise.resolve(retryClient);
    return retryClient.db(dbName);
  }
}

export async function getOrdersCollection() {
  const database = await getDb();
  return database.collection("orders");
}

export async function getSuccessOrdersCollection() {
  const database = await getDb();
  return database.collection("successorders");
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

export async function getFoodCollection() {
  const database = await getDb();
  return database.collection("food");
}

export async function getRestaurantCollection() {
  const database = await getDb();
  return database.collection("restaurant");
}