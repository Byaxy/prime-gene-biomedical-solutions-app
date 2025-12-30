import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getRequiredPermission } from "../config/permission-config";
import { userHasPermission } from "../permission-checker";

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

  const publicPaths = ["/login", "/forgot-password", "/unauthorized"];

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/assets") ||
    pathname.startsWith("/unauthorized") ||
    pathname.includes(".") ||
    publicPaths.includes(pathname)
  ) {
    return NextResponse.next();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If the user is authenticated and tries to access login/forgot-password, redirect to dashboard.
  if ((pathname === "/login" || pathname === "/forgot-password") && user) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  if (!user) {
    const redirectUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      redirectUrl.searchParams.set("redirectTo", pathname);
    }
    return NextResponse.redirect(redirectUrl);
  }

  const requiredPermission = getRequiredPermission(pathname);

  if (requiredPermission) {
    const hasPermission = await userHasPermission(
      user.id,
      requiredPermission.route,
      requiredPermission.action
    );

    if (!hasPermission) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|api|favicon.ico).*)"],
};
