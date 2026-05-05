"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, CheckCircle2, MapPin, Clock, CreditCard } from "lucide-react";
import Link from "next/link";

export default function BookingFlow() {
  const [step, setStep] = useState(1);

  const nextStep = () => setStep((s) => Math.min(4, s + 1));
  const prevStep = () => setStep((s) => Math.max(1, s - 1));

  return (
    <div className="min-h-screen bg-muted pb-20 md:pb-0">
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 w-full bg-white shadow-sm h-16 flex items-center px-4 md:hidden">
        <Link href="/" className="mr-4">
          <ChevronLeft className="h-6 w-6 text-foreground" />
        </Link>
        <div className="flex-1">
          <h1 className="font-bold text-foreground">Checkout</h1>
          <p className="text-xs text-secondary">Step {step} of 4</p>
        </div>
      </header>

      <div className="container mx-auto max-w-5xl md:py-12 md:px-4 grid md:grid-cols-3 gap-6">
        
        {/* Main Content Area (Left side on desktop) */}
        <div className="md:col-span-2 space-y-4 p-4 md:p-0">
          
          {/* Step 1: Services & Add-ons */}
          <Card className={`border-none shadow-sm ${step !== 1 ? 'opacity-60 cursor-not-allowed grayscale-[50%]' : ''}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-foreground text-white flex items-center justify-center font-bold text-sm">1</div>
                  <h2 className="text-xl font-bold text-foreground">Select Service</h2>
                </div>
                {step > 1 && <CheckCircle2 className="text-green-600 h-6 w-6" />}
              </div>
              
              {step === 1 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                    {["Premium Grooming", "Basic Bath", "Flea & Tick Treatment"].map((s, i) => (
                      <div key={i} className={`border p-4 rounded-xl flex justify-between items-center cursor-pointer transition-all ${i === 0 ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`}>
                        <div>
                          <h3 className="font-bold text-foreground">{s}</h3>
                          <p className="text-sm text-secondary">Starts from Rs. 999</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${i === 0 ? 'border-primary' : 'border-gray-300'}`}>
                          {i === 0 && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 text-lg" onClick={nextStep}>
                    Continue <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Select Pet */}
          <Card className={`border-none shadow-sm ${step !== 2 ? 'opacity-60 cursor-not-allowed grayscale-[50%]' : ''}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-foreground text-white flex items-center justify-center font-bold text-sm">2</div>
                  <h2 className="text-xl font-bold text-foreground">Who are we pampering?</h2>
                </div>
                {step > 2 && <CheckCircle2 className="text-green-600 h-6 w-6" />}
              </div>
              
              {step === 2 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border border-primary bg-primary/5 p-4 rounded-xl flex flex-col items-center gap-2 cursor-pointer">
                      <div className="w-16 h-16 rounded-full bg-muted border border-border" />
                      <h3 className="font-bold text-foreground text-center">Max</h3>
                      <p className="text-xs text-secondary text-center">Golden Retriever</p>
                    </div>
                    <div className="border border-dashed border-gray-300 p-4 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-gray-50">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-2xl">+</div>
                      <h3 className="font-bold text-secondary text-center">Add New Pet</h3>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <Button variant="outline" className="w-1/3 h-12 font-bold" onClick={prevStep}>Back</Button>
                    <Button className="w-2/3 bg-primary hover:bg-primary/90 text-white font-bold h-12 text-lg" onClick={nextStep}>
                      Continue
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 3: Address & Slot */}
          <Card className={`border-none shadow-sm ${step !== 3 ? 'opacity-60 cursor-not-allowed grayscale-[50%]' : ''}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-foreground text-white flex items-center justify-center font-bold text-sm">3</div>
                  <h2 className="text-xl font-bold text-foreground">Address & Time</h2>
                </div>
                {step > 3 && <CheckCircle2 className="text-green-600 h-6 w-6" />}
              </div>
              
              {step === 3 && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-bold text-sm text-secondary uppercase tracking-wider">Select Address</h3>
                    <div className="border border-primary bg-primary/5 p-4 rounded-xl flex gap-4 cursor-pointer">
                      <MapPin className="text-primary mt-1" />
                      <div>
                        <h4 className="font-bold text-foreground">Home</h4>
                        <p className="text-sm text-secondary mt-1">Flat 402, Building A, Sunrise Apartments, Andheri West, Mumbai</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="font-bold text-sm text-secondary uppercase tracking-wider">Select Slot</h3>
                    <div className="flex overflow-x-auto gap-3 pb-2 hide-scrollbar">
                      {["Today", "Tomorrow", "Mon, 12th", "Tue, 13th"].map((day, i) => (
                        <div key={i} className={`min-w-[100px] py-3 text-center rounded-lg border cursor-pointer ${i === 1 ? 'border-primary text-primary font-bold bg-primary/5' : 'text-secondary'}`}>
                          {day}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {["10:00 AM", "12:30 PM", "03:00 PM", "05:00 PM"].map((time, i) => (
                        <div key={i} className={`py-2 text-center rounded-lg border text-sm cursor-pointer ${i === 0 ? 'border-primary text-primary font-bold bg-primary/5' : 'text-secondary'}`}>
                          {time}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button variant="outline" className="w-1/3 h-12 font-bold" onClick={prevStep}>Back</Button>
                    <Button className="w-2/3 bg-primary hover:bg-primary/90 text-white font-bold h-12 text-lg" onClick={nextStep}>
                      Continue
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Cart/Summary Sidebar (Right side on desktop) */}
        <div className="md:col-span-1">
          <div className="sticky top-24">
            <Card className="border-none shadow-sm overflow-hidden">
              <div className="bg-foreground text-white p-4">
                <h2 className="font-bold text-lg">Booking Summary</h2>
              </div>
              <CardContent className="p-0">
                <div className="p-4 space-y-4 border-b border-dashed">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-foreground">Premium Grooming</h3>
                      <p className="text-xs text-secondary mt-1">For Max (Golden Retriever)</p>
                    </div>
                    <span className="font-bold text-foreground">Rs. 999</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-secondary flex items-center gap-1"><Clock className="h-3 w-3" /> Tomorrow, 10:00 AM</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-muted/50 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Item Total</span>
                    <span>Rs. 999</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Taxes & Fees</span>
                    <span>Rs. 180</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2">
                    <span className="text-foreground">To Pay</span>
                    <span className="text-foreground">Rs. 1179</span>
                  </div>
                </div>

                {step === 4 && (
                  <div className="p-4 space-y-3 bg-white">
                    <h3 className="font-bold text-sm text-secondary uppercase tracking-wider">Payment</h3>
                    <Button className="w-full h-12 justify-start bg-white border border-border text-foreground hover:bg-muted" variant="outline">
                      <CreditCard className="mr-3 text-secondary" /> Pay Online
                    </Button>
                    <Button className="w-full h-12 justify-start bg-white border border-border text-foreground hover:bg-muted" variant="outline">
                      <div className="mr-3 font-bold text-secondary text-xs border border-secondary px-1 py-0.5 rounded">COD</div>
                      Cash on Delivery
                    </Button>
                    <Button className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 text-lg mt-4" onClick={() => alert("Booking Placed!")}>
                      Place Booking
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

      </div>

      {/* Mobile Bottom Action Bar (visible only when step < 4 on mobile) */}
      {step < 4 && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50">
          <div>
            <p className="text-xs text-secondary font-bold uppercase tracking-wider">Total Amount</p>
            <p className="text-lg font-bold text-foreground">Rs. 1179</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-white font-bold px-8" onClick={nextStep}>
            Continue <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
