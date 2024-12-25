import { clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const publicRoutes = ["/", "/api/webhook/register", "/sign-in", "/sign-up"];

export default async function middleware(req: { auth?: { userId?: any }; nextUrl: { pathname: string; }; url: string | URL | undefined; }) {
  const { auth, nextUrl } = req;

  // Check if auth exists and destructure userId safely
  const userId = auth?.userId;

  // If the user is not authenticated and is trying to access a protected route
  if (!userId && !publicRoutes.includes(nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  // If the user is authenticated, check their role and redirect accordingly
  if (userId) {
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      const role = user.publicMetadata.role as string | undefined;

      // Admin role redirection logic
      if (role === "admin" && nextUrl.pathname === "/dashboard") {
        return NextResponse.redirect(new URL("/admin/dashboard", req.url));
      }

      // Prevent non-admin users from accessing admin routes
      if (role !== "admin" && nextUrl.pathname.startsWith("/admin")) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }

      // Redirect authenticated users trying to access public routes
      if (publicRoutes.includes(nextUrl.pathname)) {
        return NextResponse.redirect(
          new URL(role === "admin" ? "/admin/dashboard" : "/dashboard", req.url)
        );
      }
    } catch (error) {
      console.error("Error fetching user data from Clerk:", error);
      return NextResponse.redirect(new URL("/error", req.url));
    }
  }

  return NextResponse.next();  // Proceed with the request if no redirects are necessary
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
