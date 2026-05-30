export default function RefundPolicyPage() {
  return (
    <main className="bg-white">
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 prose prose-sm prose-slate">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Refund Policy</h1>
          <p className="mt-4 text-lg text-muted-foreground">Last updated: May 2026</p>

          <div className="mt-10 space-y-6 text-base leading-7 text-muted-foreground">
            <h2 className="text-xl font-bold text-foreground">1. Cancellation by Customer</h2>
            <p>
              Customers may cancel a booking up to 24 hours before the scheduled service time for a full refund. Cancellations made within 24 hours of the appointment may be subject to a cancellation fee of up to 25% of the service cost.
            </p>

            <h2 className="text-xl font-bold text-foreground">2. Cancellation by Pupparazzi</h2>
            <p>
              If Pupparazzi cancels a booking due to unavailability of staff, weather conditions, or any other operational reason, the customer will receive a full refund within 5-7 business days.
            </p>

            <h2 className="text-xl font-bold text-foreground">3. Refund for Prepaid Bookings</h2>
            <p>
              For bookings paid online (full payment or advance), refunds will be processed to the original payment method. Refunds typically take 5-7 business days to reflect in your account depending on your bank.
            </p>

            <h2 className="text-xl font-bold text-foreground">4. No-Show Policy</h2>
            <p>
              If the customer is not available at the scheduled time and location, and does not respond to calls within 15 minutes, the booking will be marked as a no-show. No refund will be provided for no-show bookings.
            </p>

            <h2 className="text-xl font-bold text-foreground">5. Service Dissatisfaction</h2>
            <p>
              If you are not satisfied with the service provided, please contact us within 24 hours of service completion at pupparazzipetstore@gmail.com. We will review your concern and may offer a partial refund, credit, or a complimentary redo at our discretion.
            </p>

            <h2 className="text-xl font-bold text-foreground">6. Package Refunds</h2>
            <p>
              Multi-session packages (6, 12, or 24 sessions) are non-refundable once the first session has been used. Unused sessions may be transferred to another pet within the same household.
            </p>

            <h2 className="text-xl font-bold text-foreground">7. Contact for Refunds</h2>
            <p>
              For all refund-related queries, please email us at <a href="mailto:pupparazzipetstore@gmail.com" className="text-primary font-bold hover:underline">pupparazzipetstore@gmail.com</a> with your booking ID and reason for the refund request.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
