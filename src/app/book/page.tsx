"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, CheckCircle2, MapPin, Clock, Loader2, PawPrint } from "lucide-react";
import Link from "next/link";

interface Service { id:string; name:string; category:string; description_short:string|null; price:number; discounted_price:number|null; }
interface Pet { id:string; name:string; type:string; breed:string|null; }

const PET_TYPES = ["Dog","Cat","Bird","Rabbit","Fish","Other"];
const SIZES = ["Small","Medium","Large","Giant"];
const GENDERS = ["Male","Female"];
const TIME_SLOTS = ["09:00 AM","10:00 AM","11:00 AM","12:00 PM","02:00 PM","03:00 PM","04:00 PM","05:00 PM"];

function getNextDays(n:number){const d=[];for(let i=0;i<n;i++){const dt=new Date();dt.setDate(dt.getDate()+i);d.push(dt);}return d;}
function fmtDay(d:Date){return d.toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"});}

export default function BookingFlow() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedService, setSelectedService] = useState<string>("");
  const [selectedPet, setSelectedPet] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState(0);
  const [selectedTime, setSelectedTime] = useState("");
  const [showAddPet, setShowAddPet] = useState(false);
  const [address, setAddress] = useState({ line1:"", city:"", state:"", pincode:"", phone:"" });
  const [petForm, setPetForm] = useState({ name:"",type:"Dog",breed:"",gender:"Male",weight:"",size:"Medium",aggression_level:"3",allergies:"",dietary_preference:"",neutered:false,vaccination_status:"",vet_name:"",vet_contact:"" });
  const [petSaving, setPetSaving] = useState(false);
  const [error, setError] = useState("");
  const days = getNextDays(7);

  useEffect(()=>{
    if(status==="unauthenticated") router.push("/login?callbackUrl=/book");
    if(status==="authenticated") fetchData();
  },[status]);

  async function fetchData(){
    setLoading(true);
    const [sRes, pRes] = await Promise.all([
      fetch("/api/services"),
      fetch(`/api/users/${(session?.user as any)?.id}/pets`)
    ]);
    if(sRes.ok) setServices(await sRes.json());
    if(pRes.ok) setPets(await pRes.json());
    setLoading(false);
  }

  async function savePet(){
    setPetSaving(true); setError("");
    try{
      const res = await fetch("/api/pets",{ method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ ...petForm, owner_id:(session?.user as any)?.id, weight: petForm.weight||undefined, aggression_level: petForm.aggression_level||"1" })
      });
      if(!res.ok){ setError("Failed to save pet"); setPetSaving(false); return; }
      const newPet = await res.json();
      setPets(p=>[newPet,...p]);
      setSelectedPet(newPet.id);
      setShowAddPet(false);
      setPetForm({ name:"",type:"Dog",breed:"",gender:"Male",weight:"",size:"Medium",aggression_level:"3",allergies:"",dietary_preference:"",neutered:false,vaccination_status:"",vet_name:"",vet_contact:"" });
    } catch{ setError("Error saving pet"); }
    setPetSaving(false);
  }

  async function placeBooking(){
    setSubmitting(true); setError("");
    try{
      const res = await fetch("/api/bookings",{ method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ client_id:(session?.user as any)?.id, pet_id:selectedPet, service_id:selectedService, slot_date:days[selectedDate].toISOString(), slot_time:selectedTime, notes:address.line1?`Address: ${address.line1}, ${address.city}, ${address.state} ${address.pincode}`:undefined })
      });
      if(!res.ok){ setError("Booking failed"); setSubmitting(false); return; }
      router.push("/dashboard?booked=true");
    } catch{ setError("Error placing booking"); }
    setSubmitting(false);
  }

  const svc = services.find(s=>s.id===selectedService);
  const price = svc ? (svc.discounted_price || svc.price) : 0;
  const tax = Math.round(price * 0.18);

  if(loading || status==="loading") return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>;

  return (
    <div className="min-h-screen bg-white pb-24 md:pb-0">
      <header className="sticky top-0 z-50 bg-white shadow-sm h-16 flex items-center px-4">
        <Link href="/" className="mr-4"><ChevronLeft className="h-6 w-6"/></Link>
        <div className="flex-1"><h1 className="font-bold text-foreground">Book a Service</h1><p className="text-xs text-secondary">Step {step} of 4</p></div>
      </header>

      <div className="container mx-auto max-w-5xl py-6 px-4 grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">

          {/* STEP 1: Select Service */}
          <Card className={`border-none shadow-sm ${step!==1?"opacity-50 pointer-events-none":""}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded bg-primary text-white flex items-center justify-center font-bold text-sm">1</div><h2 className="text-lg font-bold">Select Service</h2></div>
                {step>1 && <CheckCircle2 className="text-green-600 h-6 w-6"/>}
              </div>
              {step===1 && <div className="space-y-3">
                {services.map(s=>(
                  <div key={s.id} onClick={()=>setSelectedService(s.id)} className={`border p-4 rounded-xl flex justify-between items-center cursor-pointer transition-all ${selectedService===s.id?"border-primary bg-primary/10":"hover:border-accent"}`}>
                    <div><h3 className="font-bold text-foreground">{s.name}</h3><p className="text-sm text-secondary">{s.description_short}</p></div>
                    <div className="text-right"><p className="font-bold text-foreground">₹{s.discounted_price||s.price}</p>{s.discounted_price && <p className="text-xs text-secondary line-through">₹{s.price}</p>}</div>
                  </div>
                ))}
                <Button className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12" onClick={()=>{if(selectedService)setStep(2);}} disabled={!selectedService}>Continue <ChevronRight className="ml-2 h-5 w-5"/></Button>
              </div>}
            </CardContent>
          </Card>

          {/* STEP 2: Pet Details */}
          <Card className={`border-none shadow-sm ${step!==2?"opacity-50 pointer-events-none":""}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded bg-primary text-white flex items-center justify-center font-bold text-sm">2</div><h2 className="text-lg font-bold">Who are we pampering?</h2></div>
                {step>2 && <CheckCircle2 className="text-green-600 h-6 w-6"/>}
              </div>
              {step===2 && <div className="space-y-4">
                {pets.length>0 && !showAddPet && <div className="grid grid-cols-2 gap-3">
                  {pets.map(p=>(
                    <div key={p.id} onClick={()=>setSelectedPet(p.id)} className={`border p-4 rounded-xl flex flex-col items-center gap-2 cursor-pointer ${selectedPet===p.id?"border-primary bg-primary/10":"hover:border-accent"}`}>
                      <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center"><PawPrint className="h-6 w-6 text-accent"/></div>
                      <h3 className="font-bold text-sm">{p.name}</h3><p className="text-xs text-secondary">{p.breed||p.type}</p>
                    </div>
                  ))}
                  <div onClick={()=>{setShowAddPet(true);setSelectedPet("");}} className="border border-dashed p-4 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-gray-50">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-2xl">+</div>
                    <h3 className="font-bold text-sm text-secondary">Add New Pet</h3>
                  </div>
                </div>}

                {(showAddPet || pets.length===0) && <div className="space-y-3 border rounded-xl p-4 bg-muted">
                  <h3 className="font-bold text-foreground">Add Pet Details</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Pet Name *" value={petForm.name} onChange={e=>setPetForm({...petForm,name:e.target.value})} className="h-12 bg-white"/>
                    <select value={petForm.type} onChange={e=>setPetForm({...petForm,type:e.target.value})} className="h-12 border rounded-md px-3 bg-white text-sm">
                      {PET_TYPES.map(t=><option key={t}>{t}</option>)}
                    </select>
                    <Input placeholder="Breed" value={petForm.breed} onChange={e=>setPetForm({...petForm,breed:e.target.value})} className="h-12 bg-white"/>
                    <select value={petForm.gender} onChange={e=>setPetForm({...petForm,gender:e.target.value})} className="h-12 border rounded-md px-3 bg-white text-sm">
                      {GENDERS.map(g=><option key={g}>{g}</option>)}
                    </select>
                    <Input placeholder="Weight (kg)" type="number" value={petForm.weight} onChange={e=>setPetForm({...petForm,weight:e.target.value})} className="h-12 bg-white"/>
                    <select value={petForm.size} onChange={e=>setPetForm({...petForm,size:e.target.value})} className="h-12 border rounded-md px-3 bg-white text-sm">
                      {SIZES.map(s=><option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Allergies (if any)" value={petForm.allergies} onChange={e=>setPetForm({...petForm,allergies:e.target.value})} className="h-12 bg-white"/>
                    <select value={petForm.vaccination_status} onChange={e=>setPetForm({...petForm,vaccination_status:e.target.value})} className="h-12 border rounded-md px-3 bg-white text-sm">
                      <option value="">Vaccination Status</option>
                      <option>Vaccinated</option><option>Partially Vaccinated</option><option>Not Vaccinated</option>
                    </select>
                    <Input placeholder="Vet Name" value={petForm.vet_name} onChange={e=>setPetForm({...petForm,vet_name:e.target.value})} className="h-12 bg-white"/>
                    <Input placeholder="Vet Contact" value={petForm.vet_contact} onChange={e=>setPetForm({...petForm,vet_contact:e.target.value})} className="h-12 bg-white"/>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="neutered" checked={petForm.neutered} onChange={e=>setPetForm({...petForm,neutered:e.target.checked})}/>
                    <label htmlFor="neutered" className="text-sm text-secondary">Neutered / Spayed</label>
                  </div>
                  <div className="flex gap-3">
                    {pets.length>0 && <Button variant="outline" className="flex-1 h-11" onClick={()=>setShowAddPet(false)}>Cancel</Button>}
                    <Button className="flex-1 h-11 bg-primary hover:bg-primary/90 text-white font-bold" onClick={savePet} disabled={!petForm.name||petSaving}>
                      {petSaving?<Loader2 className="h-4 w-4 animate-spin mr-2"/>:null}{petSaving?"Saving...":"Save Pet"}
                    </Button>
                  </div>
                </div>}

                {!showAddPet && <div className="flex gap-3">
                  <Button variant="outline" className="w-1/3 h-12 font-bold" onClick={()=>setStep(1)}>Back</Button>
                  <Button className="w-2/3 bg-primary hover:bg-primary/90 text-white font-bold h-12" onClick={()=>{if(selectedPet)setStep(3);}} disabled={!selectedPet}>Continue</Button>
                </div>}
              </div>}
            </CardContent>
          </Card>

          {/* STEP 3: Address & Slot */}
          <Card className={`border-none shadow-sm ${step!==3?"opacity-50 pointer-events-none":""}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded bg-primary text-white flex items-center justify-center font-bold text-sm">3</div><h2 className="text-lg font-bold">Address & Time Slot</h2></div>
                {step>3 && <CheckCircle2 className="text-green-600 h-6 w-6"/>}
              </div>
              {step===3 && <div className="space-y-5">
                <div className="space-y-3">
                  <h3 className="font-bold text-sm text-secondary uppercase tracking-wider">Your Address</h3>
                  <Input placeholder="House/Flat/Block No., Street *" value={address.line1} onChange={e=>setAddress({...address,line1:e.target.value})} className="h-12 bg-white"/>
                  <div className="grid grid-cols-3 gap-3">
                    <Input placeholder="City *" value={address.city} onChange={e=>setAddress({...address,city:e.target.value})} className="h-12 bg-white"/>
                    <Input placeholder="State *" value={address.state} onChange={e=>setAddress({...address,state:e.target.value})} className="h-12 bg-white"/>
                    <Input placeholder="Pincode *" value={address.pincode} onChange={e=>setAddress({...address,pincode:e.target.value})} className="h-12 bg-white"/>
                  </div>
                  <Input placeholder="Contact Number" value={address.phone} onChange={e=>setAddress({...address,phone:e.target.value})} className="h-12 bg-white"/>
                </div>
                <div className="space-y-3">
                  <h3 className="font-bold text-sm text-secondary uppercase tracking-wider">Select Date</h3>
                  <div className="flex overflow-x-auto gap-3 pb-2 hide-scrollbar">
                    {days.map((d,i)=>(
                      <div key={i} onClick={()=>setSelectedDate(i)} className={`min-w-[100px] py-3 text-center rounded-lg border cursor-pointer text-sm ${selectedDate===i?"border-primary text-primary font-bold bg-primary/10":"text-secondary hover:border-accent"}`}>
                        {i===0?"Today":i===1?"Tomorrow":fmtDay(d)}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="font-bold text-sm text-secondary uppercase tracking-wider">Select Time</h3>
                  <div className="grid grid-cols-4 gap-3">
                    {TIME_SLOTS.map(t=>(
                      <div key={t} onClick={()=>setSelectedTime(t)} className={`py-2.5 text-center rounded-lg border text-sm cursor-pointer ${selectedTime===t?"border-primary text-primary font-bold bg-primary/10":"text-secondary hover:border-accent"}`}>{t}</div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="w-1/3 h-12 font-bold" onClick={()=>setStep(2)}>Back</Button>
                  <Button className="w-2/3 bg-primary hover:bg-primary/90 text-white font-bold h-12" onClick={()=>{if(address.line1&&address.city&&selectedTime)setStep(4);}} disabled={!address.line1||!address.city||!selectedTime}>Continue</Button>
                </div>
              </div>}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Summary */}
        <div className="md:col-span-1">
          <div className="sticky top-24">
            <Card className="border-none shadow-sm overflow-hidden">
              <div className="bg-accent text-white p-4"><h2 className="font-bold text-lg">Booking Summary</h2></div>
              <CardContent className="p-0">
                <div className="p-4 space-y-3 border-b border-dashed">
                  {svc?<div className="flex justify-between"><div><h3 className="font-bold text-foreground">{svc.name}</h3>{selectedPet&&<p className="text-xs text-secondary mt-1">For {pets.find(p=>p.id===selectedPet)?.name}</p>}</div><span className="font-bold">₹{price}</span></div>:<p className="text-sm text-secondary">Select a service</p>}
                  {selectedTime&&<p className="text-sm text-secondary flex items-center gap-1"><Clock className="h-3 w-3"/>{selectedDate===0?"Today":selectedDate===1?"Tomorrow":fmtDay(days[selectedDate])}, {selectedTime}</p>}
                  {address.line1&&<p className="text-sm text-secondary flex items-center gap-1"><MapPin className="h-3 w-3"/>{address.line1}, {address.city}</p>}
                </div>
                {svc&&<div className="p-4 bg-gray-50 space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-secondary">Subtotal</span><span>₹{price}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-secondary">GST (18%)</span><span>₹{tax}</span></div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2"><span>Total</span><span>₹{price+tax}</span></div>
                </div>}
                {step===4&&<div className="p-4 space-y-3">
                  {error&&<div className="bg-red-50 text-red-600 text-sm p-3 rounded">{error}</div>}
                  <Button variant="outline" className="w-full h-11 font-bold" onClick={()=>setStep(3)}>← Back</Button>
                  <Button className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 text-lg" onClick={placeBooking} disabled={submitting}>
                    {submitting?<><Loader2 className="mr-2 h-5 w-5 animate-spin"/>Placing...</>:"Place Booking"}
                  </Button>
                </div>}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
