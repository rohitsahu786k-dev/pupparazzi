import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Authenticated users visiting /login get redirected away (prevents refresh loop)
    if (pathname === "/login" && token) {
      const raw = req.nextUrl.searchParams.get("callbackUrl") || "/dashboard";
      const safeUrl = raw.startsWith("/") ? raw : "/dashboard";
      return NextResponse.redirect(new URL(safeUrl, req.url));
    }

    if (pathname.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    secret: process.env.NEXTAUTH_SECRET,
    pages: { signIn: "/login" },
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        if (pathname === "/login") return true;
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ["/login", "/dashboard/:path*", "/admin/:path*", "/book/:path*", "/profile/:path*", "/settings/:path*"],
};
