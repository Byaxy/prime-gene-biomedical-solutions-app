import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { allAppPaths } from "../routeUtils";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/assets") ||
    pathname.includes(".") // Catches other static files like .png, .js, .css
  ) {
    return NextResponse.next();
  }

  // If the user is authenticated and tries to access login/forgot-password, redirect to dashboard.
  if (pathname === "/login" || pathname === "/forgot-password") {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // Check if the current pathname is a protected route
  const isProtectedRoute = Array.from(allAppPaths).some((routePath) => {
    // If routePath is "/", ensure exact match for root dashboard only
    if (routePath === "/") {
      return pathname === "/";
    }
    // For other paths, check if the current pathname starts with the routePath
    // This correctly handles /inventory protecting /inventory/add-inventory
    return pathname.startsWith(routePath);
  });

  // If it's a protected route and the user is not authenticated, redirect to login
  if (isProtectedRoute) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // For any other path (e.g., truly public pages not in sidebar, or if isAuthenticated on a protected route),
  // just proceed with the original response, ensuring cookies are set.
  return supabaseResponse;
}

export const config = {
  matcher: [
    // Match all routes except static files served by Next.js and API routes
    // We handle other static file types (e.g., .png) within the middleware directly
    "/((?!_next/static|_next/image|api|favicon.ico).*)",
  ],
};
