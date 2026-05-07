"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get("callbackUrl") || "/dashboard";
  const { status } = useSession();

  useEffect(() => {
    if (status === "authenticated") router.replace(callbackUrl);
  }, [status, callbackUrl, router]);

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await signIn("google", { callbackUrl });
    } catch {
      setError("Google sign-in failed. Please try again.");
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: formData.email,
        password: formData.password,
      });
      if (res?.error) {
        setError("Invalid email or password");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || status === "authenticated") {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-white flex-col justify-center items-center text-foreground relative overflow-hidden p-12 border-r border-border">
        <div className="z-10 text-center space-y-6 max-w-md">
          <Image src="/pupparazzi-logo.png" alt="Pupparazzi" width={300} height={60} priority className="mx-auto h-16 w-auto" />
          <h1 className="text-4xl font-bold tracking-tight">Welcome back!</h1>
          <p className="text-secondary text-lg">Your pets are waiting. Login to manage bookings, pet profiles, and more.</p>
          <div className="grid grid-cols-3 gap-4 mt-8">
            {["Grooming", "Boarding", "Vet Care", "Walking", "Swimming", "Training"].map((s) => (
              <div key={s} className="bg-muted border border-border rounded-xl p-3 text-center text-sm text-secondary hover:border-primary/40 transition-colors">
                {s}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-1/2 flex flex-col p-6 md:p-12 lg:px-20 justify-center">
        <Link href="/" className="mb-10 inline-flex items-center text-secondary hover:text-foreground transition-colors font-medium text-sm">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to home
        </Link>

        <div className="max-w-md w-full mx-auto space-y-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Login</h2>
            <p className="text-secondary mt-2">
              New here?{" "}
              <Link href="/register" className="text-primary font-bold hover:underline">
                Create an account
              </Link>
            </p>
          </div>

          {/* Google Login */}
          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            className="w-full h-14 flex items-center justify-center gap-3 border-2 border-border rounded-sm hover:border-accent hover:bg-gray-50 transition-all font-semibold text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {googleLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            {googleLoading ? "Connecting..." : "Continue with Google"}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-4 text-secondary font-medium">or login with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="Email address"
              required
              value={formData.email}
              onChange={handleChange}
              className="h-14 bg-white border-2 border-border rounded-sm focus-visible:ring-0 focus-visible:border-accent font-medium transition-colors"
            />
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                required
                value={formData.password}
                onChange={handleChange}
                className="h-14 bg-white border-2 border-border rounded-sm focus-visible:ring-0 focus-visible:border-accent font-medium pr-12 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-xs font-bold text-primary hover:underline">
                Forgot password?
              </Link>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm font-medium px-4 py-3 rounded-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-14 bg-primary text-white font-bold text-lg rounded-sm hover:bg-primary/90 transition-colors"
              disabled={loading || googleLoading}
            >
              {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Logging in...</> : "Login"}
            </Button>

            <p className="text-xs text-secondary text-center leading-5">
              By logging in, I accept the{" "}
              <Link href="/terms" className="text-foreground font-bold hover:underline">Terms & Conditions</Link>{" "}
              &{" "}
              <Link href="/privacy" className="text-foreground font-bold hover:underline">Privacy Policy</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <LoginContent />
    </Suspense>
  );
}
