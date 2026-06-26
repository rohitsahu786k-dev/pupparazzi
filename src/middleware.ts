import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const DEFAULT_SITE_ORIGIN = "https://pupparazziclub.in";

function appOrigin(req: { headers: Headers }) {
  const configuredOrigin = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (configuredOrigin) return configuredOrigin.replace(/\/$/, "");

  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = forwardedHost || req.headers.get("host");
  if (host && !host.includes("localhost") && !host.startsWith("127.0.0.1")) {
    const protocol = req.headers.get("x-forwarded-proto") || "https";
    return `${protocol}://${host}`;
  }

  return DEFAULT_SITE_ORIGIN;
}

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;
    const origin = appOrigin(req);

    // Authenticated users visiting /login get redirected away (prevents refresh loop)
    if (pathname === "/login" && token) {
      const portal = token.role === "ADMIN" ? "/admin" : token.role === "STAFF" ? "/staff" : "/dashboard";
      const raw = (token.role === "ADMIN" || token.role === "STAFF") ? portal : req.nextUrl.searchParams.get("callbackUrl") || "/dashboard";
      const safeUrl = raw.startsWith("/") ? raw : portal;
      return NextResponse.redirect(new URL(safeUrl, origin));
    }

    if (pathname !== "/login" && !token) {
      const callbackUrl = `${pathname}${req.nextUrl.search}`;
      return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`, origin));
    }

    if (pathname.startsWith("/admin") && token?.role === "STAFF") {
      return NextResponse.redirect(new URL("/staff", origin));
    }

    if (pathname.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", origin));
    }

    if (pathname.startsWith("/staff") && token?.role !== "STAFF" && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", origin));
    }

    return NextResponse.next();
  },
  {
    secret: process.env.NEXTAUTH_SECRET,
    pages: { signIn: "/login" },
    callbacks: {
      authorized: () => true,
    },
  }
);

export const config = {
  matcher: ["/login", "/dashboard/:path*", "/admin/:path*", "/staff/:path*", "/book/:path*", "/profile/:path*", "/settings/:path*"],
};
