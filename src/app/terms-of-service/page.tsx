import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Users, Calendar, CreditCard, AlertTriangle, Scale, ChevronRight } from "lucide-react";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Terms of Service",
  description: "Read the terms and conditions governing your use of Pupparazzi Club's pet care platform.",
  path: "/terms-of-service",
});

const SECTIONS = [
  {
    icon: FileText,
    title: "1. Agreement to Terms",
    color: "bg-blue-50 text-blue-600",
    content:
      "By accessing and using the Pupparazzi platform, you agree to be bound by these Terms of Service. These terms constitute a legally binding agreement between you and Pupparazzi India Pvt Ltd. If you do not agree to these terms, please do not use our services.",
  },
  {
    icon: FileText,
    title: "2. Our Services",
    color: "bg-indigo-50 text-indigo-600",
    content:
      "Pupparazzi provides a platform connecting pet owners with professional grooming and boarding care providers. We act as an intermediary and are not directly responsible for the services provided by our partners.",
    list: [
      "Grooming: Complete grooming sessions and individual grooming services.",
      "Boarding: Supervised dog boarding with check-in and checkout details.",
      "Boarding packages: Flexible prepaid packages subject to availability.",
    ],
  },
  {
    icon: Users,
    title: "3. User Responsibilities",
    color: "bg-purple-50 text-purple-600",
    content:
      "As a user of our platform, you are responsible for providing accurate information about yourself and your pets, maintaining the security of your account credentials, and ensuring your pets are up to date on vaccinations. You agree not to misuse the platform or engage in any fraudulent activity.",
  },
  {
    icon: Calendar,
    title: "4. Booking, Cancellations & Reminders",
    color: "bg-green-50 text-green-600",
    content:
      "All bookings are subject to service provider availability. Cancellations must be made at least 24 hours in advance to avoid a cancellation fee. Same-day cancellations may incur a fee of up to 50% of the service price. Refunds are processed within 5-7 business days to the original payment method.",
    list: [
      "Free cancellation: More than 24 hours before appointment.",
      "50% fee: Cancellation within 24 hours of appointment.",
      "No refund: No-show or cancellation within 2 hours.",
      "Exceptional circumstances may be reviewed on a case-by-case basis.",
      "Booking reminders are handled inside Pupparazzi by email or app notifications. We do not create Google Calendar events for bookings.",
    ],
  },
  {
    icon: CreditCard,
    title: "5. Payments & Pricing",
    color: "bg-orange-50 text-orange-600",
    content:
      "All prices are listed in Indian Rupees (INR) and include applicable taxes. Payments are processed securely through our payment partners. Pupparazzi reserves the right to change pricing with reasonable notice. Promotional offers and discounts are subject to separate terms.",
  },
  {
    icon: AlertTriangle,
    title: "6. Limitation of Liability",
    color: "bg-rose-50 text-rose-600",
    content:
      "While we strive to ensure the highest standards of service, Pupparazzi shall not be liable for any indirect, incidental, or consequential damages arising from the use of our services. Our liability is limited to the amount paid for the specific service in question.",
  },
  {
    icon: Scale,
    title: "7. Governing Law",
    color: "bg-teal-50 text-teal-600",
    content:
      "These Terms of Service shall be governed by and construed in accordance with the laws of India. Any disputes arising under these terms shall be subject to the exclusive jurisdiction of the courts in Mumbai, Maharashtra.",
  },
];

export default function TermsOfServicePage() {
  return (
    <div className="bg-[#F8FAFC]">
      {/* Hero Banner */}
      <section className="w-full bg-gradient-to-br from-slate-900 via-slate-800 to-purple-900/70 py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-6">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white font-medium">Terms of Service</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 shrink-0">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">Terms of Service</h1>
              <p className="text-slate-300 mt-2 text-lg">Last updated: May 6, 2026</p>
            </div>
          </div>
          <p className="mt-8 text-slate-300 max-w-2xl text-lg leading-relaxed">
            Please read these terms carefully before using Pupparazzi. By using our platform, you agree to these terms and conditions which are designed to ensure a safe, fair, and transparent experience for all users.
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
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTA */}
          <div className="mt-12 bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-3xl p-8 border border-primary/20 text-center">
            <p className="text-slate-700 font-medium">
              Have questions about our terms? We&apos;re happy to help.
            </p>
            <a
              href="mailto:support@pupparazzi.in"
              className="inline-block mt-4 bg-primary text-white font-bold px-8 py-3 rounded-full hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25"
            >
              Contact Legal Team
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
