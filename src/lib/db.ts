import { MongoClient, Db, Collection } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const dbName = process.env.DB_NAME || "food-delivery-platform";

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export async function getDatabase(): Promise<Db> {
  const connectedClient = await clientPromise;
  return connectedClient.db(dbName);
}

export const getDb = getDatabase;

export async function getOrdersCollection(): Promise<Collection> {
  const db = await getDatabase();
  return db.collection("orders");
}

export async function getSuccessOrdersCollection(): Promise<Collection> {
  const db = await getDatabase();
  return db.collection("successOrders");
}

export async function getCartCollection(): Promise<Collection> {
  const db = await getDatabase();
  return db.collection("carts");
}

export async function getSettingsCollection(): Promise<Collection> {
  const db = await getDatabase();
  return db.collection("settings");
}

export async function getCouponsCollection(): Promise<Collection> {
  const db = await getDatabase();
  return db.collection("coupons");
}

export async function getTransactionsCollection(): Promise<Collection> {
  const db = await getDatabase();
  return db.collection("transactions");
}

export async function getReviewsCollection(): Promise<Collection> {
  const db = await getDatabase();
  return db.collection("reviews");
}

export async function getUsersCollection(): Promise<Collection> {
  const db = await getDatabase();
  return db.collection("users");
}

export async function getRestaurantsCollection(): Promise<Collection> {
  const db = await getDatabase();
  return db.collection("restaurants");
}

export const getRestaurantCollection = getRestaurantsCollection;

export async function getFoodCollection(): Promise<Collection> {
  const db = await getDatabase();
  return db.collection("foodItems");
}

export { clientPromise };
export default getDatabase;
