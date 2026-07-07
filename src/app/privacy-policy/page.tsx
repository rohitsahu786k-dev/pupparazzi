import type { Metadata } from "next";
import Link from "next/link";
import { Shield, Lock, MapPin, Database, Mail, ChevronRight } from "lucide-react";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description: "Learn how Pupparazzi Club collects, uses, and protects your personal data.",
  path: "/privacy-policy",
});

const SECTIONS = [
  {
    icon: Shield,
    title: "1. Introduction",
    color: "bg-blue-50 text-blue-600",
    content:
      'Welcome to Pupparazzi ("Company", "we", "our", "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, and share information about you when you use our platform.',
  },
  {
    icon: Database,
    title: "2. Information We Collect",
    color: "bg-purple-50 text-purple-600",
    content:
      "We collect information you provide directly to us, such as your name, email address, phone number, and pet details when you create an account or make a booking. We also collect usage data automatically as you interact with our services.",
    list: [
      "Personal Data: Name, email, phone number, and pet details.",
      "Location Data: Your approximate city/state via IP address to show relevant services.",
      "Payment Data: Billing details to process transactions securely.",
      "Usage Data: Pages visited, services browsed, and booking history.",
    ],
  },
  {
    icon: Lock,
    title: "3. Google Sign-In",
    color: "bg-green-50 text-green-600",
    content:
      "Our application uses Google OAuth 2.0 for secure, passwordless sign-in. We request only basic profile scopes and do not request Google Calendar access:",
    list: [
      "Email & Basic Profile: To create and identify your account.",
      "No Calendar Scope: Pupparazzi booking reminders are handled inside the app by email or app notifications.",
    ],
    footer:
      "Your Google data is never sold or shared with third parties for advertising. We comply fully with the Google API Services User Data Policy, including the Limited Use requirements. You can revoke Google sign-in access at any time from your Google Account permissions page without affecting existing Pupparazzi bookings.",
  },
  {
    icon: MapPin,
    title: "4. Location Data",
    color: "bg-orange-50 text-orange-600",
    content:
      "We use your approximate location (derived from your IP address) solely to show nearby pet care services and relevant offers. We do not track your precise GPS location without explicit, in-app permission. You may opt out at any time through your account settings.",
  },
  {
    icon: Shield,
    title: "5. Data Security",
    color: "bg-rose-50 text-rose-600",
    content:
      "We implement industry-standard security measures including TLS encryption, secure database storage, and regular security audits to protect your personal information. However, no method of transmission over the Internet is 100% secure.",
  },
  {
    icon: Mail,
    title: "6. Contact Us",
    color: "bg-teal-50 text-teal-600",
    content:
      "If you have questions or concerns about this Privacy Policy, please contact us at support@pupparazzi.in or write to us at: Pupparazzi India Pvt Ltd, 123 Pet Care Lane, Bandra West, Mumbai, Maharashtra 400050, India.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="bg-[#F8FAFC]">
      {/* Hero Banner */}
      <section className="w-full bg-gradient-to-br from-slate-900 via-slate-800 to-primary/80 py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-6">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white font-medium">Privacy Policy</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 shrink-0">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">Privacy Policy</h1>
              <p className="text-slate-300 mt-2 text-lg">Last updated: May 6, 2026</p>
            </div>
          </div>
          <p className="mt-8 text-slate-300 max-w-2xl text-lg leading-relaxed">
            Your privacy is our top priority. This policy describes how we handle your data with care, transparency, and respect — just the way you'd expect from a company that cares about you and your pets.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
          <div className="space-y-6">
            {SECTIONS.map((section, i) => {
              const Icon = section.icon;
              return (
                <div key={i} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-5">
                    <div className={`w-12 h-12 rounded-xl ${section.color} flex items-center justify-center shrink-0 mt-1`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-slate-900 mb-3">{section.title}</h2>
                      <p className="text-slate-600 leading-relaxed">{section.content}</p>
                      {section.list && (
                        <ul className="mt-4 space-y-2">
                          {section.list.map((item, j) => (
                            <li key={j} className="flex items-start gap-3 text-slate-600">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                              <span className="text-sm leading-relaxed">{item}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {(section as any).footer && (
                        <p className="mt-4 text-sm text-slate-500 leading-relaxed border-t border-slate-100 pt-4">
                          {(section as any).footer}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTA */}
          <div className="mt-12 bg-gradient-to-r from-primary/10 to-orange-500/10 rounded-3xl p-8 border border-primary/20 text-center">
            <p className="text-slate-700 font-medium">
              Have a question about how we handle your data?
            </p>
            <a
              href="mailto:support@pupparazzi.in"
              className="inline-block mt-4 bg-primary text-white font-bold px-8 py-3 rounded-full hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25"
            >
              Contact Privacy Team
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
