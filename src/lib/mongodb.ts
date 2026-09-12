import "@/lib/setup-dns";
import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || "food-delivery-platform";

if (!uri) {
  throw new Error("Please add your MONGODB_URI to .env");
}

const globalWithMongo = global as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

function createClientPromise(): Promise<MongoClient> {
  const client = new MongoClient(uri as string, {
    serverSelectionTimeoutMS: 8000,
  });
  return client.connect().catch((err) => {
    delete globalWithMongo._mongoClientPromise;
    throw err;
  });
}

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  if (!globalWithMongo._mongoClientPromise) {
    globalWithMongo._mongoClientPromise = createClientPromise();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  clientPromise = createClientPromise();
}

export default clientPromise;

export async function getDb(): Promise<Db> {
  try {
    const connectedClient = await clientPromise;
    return connectedClient.db(dbName);
  } catch (err) {
    delete globalWithMongo._mongoClientPromise;
    const retryClient = await createClientPromise();
    globalWithMongo._mongoClientPromise = Promise.resolve(retryClient);
    return retryClient.db(dbName);
  }
}
