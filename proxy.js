import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
export default function proxy(request, event) {
  if (
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    !process.env.CLERK_SECRET_KEY
  )
    return NextResponse.next();
  return clerkMiddleware()(request, event);
}
export const config = { matcher: ["/((?!_next|.*\\..*).*)", "/api/(.*)"] };
