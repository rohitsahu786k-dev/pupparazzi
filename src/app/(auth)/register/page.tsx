"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const signInRes = await signIn("credentials", {
          redirect: false,
          email: formData.email,
          password: formData.password,
        });

        if (signInRes?.error) {
          setError(signInRes.error);
        } else {
          router.push("/dashboard");
        }
      } else {
        const data = await res.json();
        setError(data.message || "Registration failed");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side banner (Desktop only) */}
      <div className="hidden lg:flex w-1/2 bg-[#02060c] flex-col justify-center items-center text-white relative overflow-hidden">
        <div className="z-10 text-center space-y-6">
          <div className="w-20 h-20 bg-primary mx-auto flex items-center justify-center rounded-xl">
            <span className="text-4xl font-bold text-white">P</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Join PetCare Pro</h1>
          <p className="text-gray-400 text-lg max-w-md mx-auto">Get access to premium pet care services, track your bookings, and keep your pets healthy.</p>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      </div>

      {/* Right side registration form */}
      <div className="w-full lg:w-1/2 flex flex-col p-6 md:p-12 lg:px-24 justify-center bg-white">
        <Link href="/" className="mb-8 inline-flex items-center text-secondary hover:text-foreground transition-colors font-medium">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to home
        </Link>
        
        <div className="max-w-md w-full mx-auto space-y-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Sign up</h2>
            <p className="text-secondary mt-2">
              or <Link href="/login" className="text-primary font-bold hover:underline">login to your account</Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <Input 
                id="phone" 
                name="phone" 
                type="tel" 
                placeholder="Phone Number" 
                required 
                value={formData.phone} 
                onChange={handleChange}
                className="h-14 bg-white border-border rounded-none focus-visible:ring-0 focus-visible:border-black font-medium" 
              />
              <Input 
                id="name" 
                name="name" 
                placeholder="Name" 
                required 
                value={formData.name} 
                onChange={handleChange}
                className="h-14 bg-white border-border rounded-none focus-visible:ring-0 focus-visible:border-black font-medium" 
              />
              <Input 
                id="email" 
                name="email" 
                type="email" 
                placeholder="Email" 
                required 
                value={formData.email} 
                onChange={handleChange}
                className="h-14 bg-white border-border rounded-none focus-visible:ring-0 focus-visible:border-black font-medium" 
              />
              <Input 
                id="password" 
                name="password" 
                type="password" 
                placeholder="Password"
                required 
                value={formData.password} 
                onChange={handleChange}
                className="h-14 bg-white border-border rounded-none focus-visible:ring-0 focus-visible:border-black font-medium" 
              />
            </div>

            {error && <p className="text-sm text-red-500 font-bold">{error}</p>}

            <Button type="submit" className="w-full h-14 bg-primary text-white font-bold text-lg rounded-none hover:bg-primary/90 shadow-warm" disabled={loading}>
              {loading ? "Creating account..." : "CONTINUE"}
            </Button>
            
            <div className="text-xs text-secondary">
              By creating an account, I accept the <Link href="/terms" className="text-foreground font-bold hover:underline">Terms & Conditions</Link> & <Link href="/privacy" className="text-foreground font-bold hover:underline">Privacy Policy</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
