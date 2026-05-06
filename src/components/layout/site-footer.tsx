import Link from "next/link";
import Image from "next/image";
import { Heart, Star } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="w-full bg-white py-20 border-t border-slate-100">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
          <div className="space-y-6">
            <Image
              src="/pupparazzi-logo.png"
              alt="Pupparazzi"
              width={180}
              height={36}
              className="h-10 w-auto"
            />
            <p className="text-slate-500 text-sm leading-relaxed">
              India&apos;s most loved pet care platform. Providing luxury grooming and medical care since 2026.
            </p>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-primary transition-colors cursor-pointer border border-slate-100">
                <Heart className="h-4 w-4" />
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-primary transition-colors cursor-pointer border border-slate-100">
                <Star className="h-4 w-4" />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="font-bold text-slate-900 uppercase tracking-widest text-xs">Company</h4>
            <ul className="space-y-3 text-sm font-medium text-slate-500">
              <li><Link href="#" className="hover:text-primary transition-colors">About Us</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Careers</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Partner with Us</Link></li>
            </ul>
          </div>

          <div className="space-y-6">
            <h4 className="font-bold text-slate-900 uppercase tracking-widest text-xs">Support</h4>
            <ul className="space-y-3 text-sm font-medium text-slate-500">
              <li><Link href="#" className="hover:text-primary transition-colors">Help Center</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Contact Us</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Refund Policy</Link></li>
            </ul>
          </div>

          <div className="space-y-6">
            <h4 className="font-bold text-slate-900 uppercase tracking-widest text-xs">Legal</h4>
            <ul className="space-y-3 text-sm font-medium text-slate-500">
              <li><Link href="/terms-of-service" className="hover:text-primary transition-colors">Terms &amp; Conditions</Link></li>
              <li><Link href="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Cookie Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-20 pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">
            © 2026 Pupparazzi India Pvt Ltd. All rights reserved.
          </p>
          <div className="flex gap-8 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            <span>Made with ❤️ for Pets</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
