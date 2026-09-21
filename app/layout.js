import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
export const metadata = {
  title: "Morfynx — Your content, every format",
  description: "An image and video studio powered by Cloudinary.",
};
export default function RootLayout({ children }) {
  const content = (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
  return process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    process.env.CLERK_SECRET_KEY ? (
    <ClerkProvider>{content}</ClerkProvider>
  ) : (
    content
  );
}
