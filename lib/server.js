import { auth } from "@clerk/nextjs/server";
import { neon } from "@neondatabase/serverless";
import { v2 as cloudinary } from "cloudinary";
import { liveReady } from "./config.js";
export async function requireUser() {
  if (!liveReady()) throw new Error("DEMO_MODE");
  const { userId } = await auth();
  if (!userId) throw new Error("UNAUTHORIZED");
  return userId;
}
export function db() {
  return neon(process.env.DATABASE_URL);
}
export function cloud() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  return cloudinary;
}
export function apiError(error) {
  if (error.message === "DEMO_MODE")
    return Response.json(
      { error: "Live mode needs the service keys in .env.local." },
      { status: 503 },
    );
  if (error.message === "UNAUTHORIZED")
    return Response.json(
      { error: "Please sign in before uploading." },
      { status: 401 },
    );
  console.error("Media operation failed:", error.message);
  return Response.json(
    {
      error:
        "The service could not complete this request. Check your service configuration and try again.",
    },
    { status: 500 },
  );
}
