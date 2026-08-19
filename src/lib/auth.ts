import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { MongoClient } from "mongodb";

const mongodbUri = process.env.MONGODB_URI || "mongodb+srv://food-delivery-platform:qF41pZNIqpFmA9HU@cluster0.xwtabrp.mongodb.net/food-delivery-platform?retryWrites=true&w=majority&appName=Cluster0";

const client = new MongoClient(mongodbUri);
const db = client.db("food-delivery-platform");

export const auth = betterAuth({
  database: mongodbAdapter(db),
  emailAndPassword: { 
    enabled: true, 
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "Customer",
      },
      phone: {
        type: "string",
        required: false,
      },
    },
  },
});