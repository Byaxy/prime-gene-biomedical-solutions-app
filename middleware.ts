import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define public routes that don't require authentication
const publicRoutes = ["/login", "/forgot-password", "/reset-password"];

// Define static asset routes
const staticRoutes = [
  "/_next/static",
  "/_next/image",
  "/favicon.ico",
  "/assets",
  "/api/placeholder",
];

const isPublicRoute = (path: string) => {
  return publicRoutes.some((route) => path.startsWith(route));
};

const isStaticRoute = (path: string) => {
  return staticRoutes.some((route) => path.startsWith(route));
};

const isApiRoute = (path: string) => {
  return path.startsWith("/api/");
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and API routes
  if (isStaticRoute(pathname) || isApiRoute(pathname)) {
    return NextResponse.next();
  }

  // Check for auth cookie
  const isAuthenticated = request.cookies.has("auth_session");

  // Handle public routes
  if (isPublicRoute(pathname)) {
    // Redirect to home if authenticated user tries to access login/register pages
    if (isAuthenticated && pathname === "/login") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // For other public routes, just continue
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "no-store, must-revalidate");
    return response;
  }

  // Handle protected routes
  if (!isAuthenticated) {
    // Store the original URL to redirect back after login
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // User is authenticated, allow access but ensure dynamic rendering
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "no-store, must-revalidate");
  response.headers.set("x-middleware-cache", "no-cache");
  return response;
}

export const config = {
  matcher: [
    // Match all routes except static files
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
