"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const handleServiceClick = (serviceId: string) => {
    // For now, simpler navigation or opening modal
    // In Snabbit, this usually opens a sub-category page or modal
    router.push(`/services?category=${serviceId}`);
  };

  return (
    <main className="min-h-screen bg-background md:bg-muted/10">
      <div className="space-y-2 md:space-y-8 pb-24 md:pb-12 bg-background md:bg-transparent">
        {/* Trust/Social Proof Section (Filler for now to add page weight) */}
        <section className="py-8 md:py-12">
          <div className="page-container">
            <div className="bg-primary/5 rounded-2xl p-6 md:p-12 text-center">
              <h3 className="text-xl md:text-3xl font-bold text-[#1C8AFF] mb-3">
                Trusted by 6,000+ Users
              </h3>
              <p className="text-muted-foreground max-w-xl mx-auto mb-6 flex flex-col">
                <span>
                  From improving CIBIL, credit score, loan guidance, taxation &
                  filing to investment like SIPs, mutual funds, stocks & gold.
                </span>
                <span>Book expert help in 10 minutes.</span>
              </p>
              <div className="flex flex-wrap justify-center gap-8 md:gap-16 pt-4">
                {/* Stat 1 */}
                <div className="flex flex-col items-center gap-2">
                  <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-white/50 flex items-center justify-center text-[#1C8AFF]">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-5 h-5 md:w-6 md:h-6"
                    >
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                      <polyline points="14 2 14 8 20 8" />
                      <path d="M12 13v5" />
                      <path d="M12 18l3-3" />
                      <path d="M12 18l-3-3" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-2xl md:text-3xl font-bold text-foreground">
                      5k+
                    </div>
                    <div className="text-xs md:text-sm text-muted-foreground font-medium tracking-wider">
                      Services Completed
                    </div>
                  </div>
                </div>

                {/* Stat 2 */}
                <div className="flex flex-col items-center gap-2">
                  <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-white/50 flex items-center justify-center text-[#1C8AFF]">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-5 h-5 md:w-6 md:h-6"
                    >
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-2xl md:text-3xl font-bold text-foreground">
                      1000+
                    </div>
                    <div className="text-xs md:text-sm text-muted-foreground font-medium tracking-wider">
                      Verified Experts
                    </div>
                  </div>
                </div>

                {/* Stat 3 */}
                <div className="flex flex-col items-center gap-2">
                  <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-white/50 flex items-center justify-center text-[#1C8AFF]">
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      stroke="none"
                      className="w-5 h-5 md:w-6 md:h-6 text-yellow-400"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-2xl md:text-3xl font-bold text-foreground">
                      4.9/5
                    </div>
                    <div className="text-xs md:text-sm text-muted-foreground font-medium tracking-wider">
                      Customer Rating
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
