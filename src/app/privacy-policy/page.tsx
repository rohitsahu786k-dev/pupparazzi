import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function PrivacyPolicy() {
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
        
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Privacy Policy</h1>
        <p className="text-slate-500 mb-8 italic">Last Updated: May 6, 2026</p>

        <div className="prose prose-slate max-w-none space-y-6 text-slate-700">
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">1. Introduction</h2>
            <p>
              Welcome to Pupparazzi ("Company", "we", "our", "us"). We are committed to protecting your personal information and your right to privacy. If you have any questions or concerns about this privacy notice, or our practices with regards to your personal information, please contact us at support@pupparazzi.in.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">2. Information We Collect</h2>
            <p>
              We collect personal information that you voluntarily provide to us when you register on the Website, express an interest in obtaining information about us or our products and Services, when you participate in activities on the Website or otherwise when you contact us.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Personal Data:</strong> Name, email address, phone number, and pet details.</li>
              <li><strong>Location Data:</strong> We may request access or permission to and track location-based information from your browser or mobile device to provide location-based services (like finding nearby groomers).</li>
              <li><strong>Payment Data:</strong> We may collect data necessary to process your payment if you make purchases, such as your payment instrument number.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">3. How We Use Your Information</h2>
            <p>
              We use personal information collected via our Website for a variety of business purposes described below. We process your personal information for these purposes in reliance on our legitimate business interests, in order to enter into or perform a contract with you, with your consent, and/or for compliance with our legal obligations.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>To facilitate account creation and logon process.</li>
              <li>To post testimonials.</li>
              <li>To request feedback.</li>
              <li>To enable user-to-user communications.</li>
              <li>To manage user accounts.</li>
              <li>To send administrative information to you.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">4. Google Verification & Data Safety</h2>
            <p>
              Our application uses Google OAuth for authentication. We only request the minimum necessary permissions to verify your identity. Your Google data is never shared with third parties except as necessary to provide our services. We comply with Google API Services User Data Policy, including the Limited Use requirements.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">5. Data Retention</h2>
            <p>
              We will only keep your personal information for as long as it is necessary for the purposes set out in this privacy notice, unless a longer retention period is required or permitted by law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">6. Contact Us</h2>
            <p>
              If you have questions or comments about this notice, you may email us at support@pupparazzi.in or by post to:
            </p>
            <div className="bg-slate-50 p-4 rounded-lg mt-2 border border-slate-100">
              <p className="font-medium">Pupparazzi India Pvt Ltd</p>
              <p>123 Pet Care Lane, Bandra West</p>
              <p>Mumbai, Maharashtra 400050</p>
              <p>India</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
