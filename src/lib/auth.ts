import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { MongoClient } from "mongodb";

const mongodbUri =
  process.env.MONGODB_URI ||
  "mongodb+srv://food-delivery-platform:qF41pZNIqpFmA9HU@cluster0.xwtabrp.mongodb.net/food-delivery-platform?retryWrites=true&w=majority&appName=Cluster0";

const client = new MongoClient(mongodbUri);
const db = client.db("food-delivery-platform");

// Google OAuth is registered only when both credentials are present, so that
// contributors without them keep a working email/password login instead of a
// broken /api/auth route. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to
// .env, with http://localhost:3000/api/auth/callback/google as the authorized
// redirect URI in the Google Cloud console.
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

export const auth = betterAuth({
  database: mongodbAdapter(db),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    ...(googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        }
      : {}),
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
