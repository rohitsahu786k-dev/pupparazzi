import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm p-8 md:p-12 border border-slate-100">
        <Link 
          href="/" 
          className="inline-flex items-center text-sm text-slate-500 hover:text-primary transition-colors mb-8 group"
        >
          <ChevronLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>
        
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Terms of Service</h1>
        <p className="text-slate-500 mb-8 italic">Last Updated: May 6, 2026</p>

        <div className="prose prose-slate max-w-none space-y-6 text-slate-700">
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">1. Agreement to Terms</h2>
            <p>
              These Terms of Service constitute a legally binding agreement made between you, whether personally or on behalf of an entity ("you") and Pupparazzi ("Company", "we", "us", or "our"), concerning your access to and use of the pupparazzi.in website as well as any other media form, media channel, mobile website or mobile application related, linked, or otherwise connected thereto.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">2. Services</h2>
            <p>
              Pupparazzi provides a platform to book pet grooming, boarding, walking, and training services. We act as an intermediary between pet owners and professional service providers. While we vet our partners, users are encouraged to perform their own due diligence.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">3. User Representations</h2>
            <p>
              By using the site, you represent and warrant that: (1) all registration information you submit will be true, accurate, current, and complete; (2) you will maintain the accuracy of such information and promptly update such registration information as necessary; (3) you have the legal capacity and you agree to comply with these Terms of Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">4. Booking & Cancellations</h2>
            <p>
              Bookings are subject to availability. Cancellations made within 24 hours of the scheduled service may incur a cancellation fee. Refunds, if applicable, will be processed according to our internal refund policy and may take 5-7 business days to reflect in your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">5. Limitation of Liability</h2>
            <p>
              In no event will we or our directors, employees, or agents be liable to you or any third party for any direct, indirect, consequential, exemplary, incidental, special, or punitive damages, including lost profit, lost revenue, loss of data, or other damages arising from your use of the site or services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">6. Governing Law</h2>
            <p>
              These Terms shall be governed by and defined following the laws of India. Pupparazzi India Pvt Ltd and yourself irrevocably consent that the courts of Mumbai shall have exclusive jurisdiction to resolve any dispute which may arise in connection with these terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">7. Modifications</h2>
            <p>
              We reserve the right, in our sole discretion, to make changes or modifications to these Terms of Service at any time and for any reason. We will alert you about any changes by updating the "Last updated" date of these Terms of Service.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
