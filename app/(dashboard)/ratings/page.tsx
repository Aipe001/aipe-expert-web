"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/store/store";
import { expertApi, EarningsStats } from "@/lib/api/expert";
import { motion } from "framer-motion";
import { Star, StarHalf, CheckCircle2, Award, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Review {
  id: string;
  userName: string;
  title: string;
  rating: number;
  review: string;
  date: string;
}

export default function RatingsPage() {
  const router = useRouter();
  const { isAuthenticated, onboardingStatus } = useSelector((state: RootState) => state.auth);
  const expertId = onboardingStatus?.expert?.id;

  const [stats, setStats] = useState<EarningsStats | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/");
      return;
    }

    const fetchData = async () => {
      try {
        const statsData = await expertApi.getEarningsStats();
        setStats(statsData);

        if (expertId) {
          const reviewsData = await expertApi.getExpertReviews(expertId);
          // Assuming reviewsData has fields like { id, rating, comment, createdAt, user: { firstName, lastName } }
          const mappedReviews: Review[] = reviewsData.map((r: any) => ({
            id: r.id,
            userName: `${r.user?.firstName || "Anonymous"} ${r.user?.lastName || ""}`,
            title: `Service Reference: ${r.bookingId?.substring(0, 8) || "N/A"}`,
            rating: r.rating,
            review: r.comment || "No comment provided.",
            date: new Date(r.createdAt || Date.now()).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
          }));
          setReviews(mappedReviews);
        }
      } catch (err) {
        console.error("Failed to fetch ratings data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, router, expertId]);

  const averageRating = stats?.rating || 0;
  const totalServices = stats?.completedConsultations || 0;
  const totalReviews = stats?.totalReviews || 0;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 pb-10 pt-8 px-4 lg:px-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="max-w-4xl mx-auto space-y-8 pb-10 pt-8 px-4 lg:px-0"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Top Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div variants={itemVariants}>
          <Card className="bg-linear-to-br from-[#1C8AFF] to-[#0066CC] border-none text-white overflow-hidden relative shadow-lg">
            <div className="absolute right-[-10%] top-[-10%] opacity-10">
              <Award className="h-32 w-32" />
            </div>
            <CardContent className="p-8 flex flex-col items-center text-center space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-semibold uppercase tracking-widest opacity-80">Average Rating</span>
              </div>
              <span className="text-6xl font-black">{averageRating.toFixed(1)}</span>
              <div className="flex gap-1 mt-2">
                {[...Array(5)].map((_, i) => {
                  const value = i + 1;
                  if (value <= Math.floor(averageRating)) {
                    return <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />;
                  } else if (value - 0.5 <= averageRating) {
                    return <StarHalf key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />;
                  } else {
                    return <Star key={i} className="h-5 w-5 text-white/30" />;
                  }
                })}
              </div>
              <p className="text-white/70 text-sm">{totalReviews} reviews</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-white border-none shadow-sm h-full flex flex-col justify-center">
            <CardContent className="p-8 flex flex-col items-center text-center space-y-1">
              <div className="bg-green-50 p-3 rounded-full mb-3">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <span className="text-4xl font-bold text-slate-800">{totalServices}</span>
              <p className="text-slate-500 font-medium lowercase">Total Services Completed</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Reviews Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-800">Customer Reviews</h2>
          {totalReviews > 0 && (
            <span className="text-sm text-slate-500 font-medium">{totalReviews} total reviews</span>
          )}
        </div>

        {reviews.length === 0 ? (
          <Card className="border-none shadow-sm">
            <CardContent className="p-12 flex flex-col items-center text-center">
              <div className="bg-slate-100 p-4 rounded-full mb-4">
                <Star className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="font-bold text-lg text-slate-700">No Reviews Yet</h3>
              <p className="text-slate-500 mt-1 max-w-sm">
                Your customer reviews will appear here once they start rating your services.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <motion.div key={review.id} variants={itemVariants}>
                <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="flex-1 space-y-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-bold text-[#1C8AFF] uppercase tracking-wider">
                            Ticket #{review.id}
                          </span>
                          <h3 className="text-lg font-bold text-slate-900">{review.userName}</h3>
                          <p className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                            <Award className="h-4 w-4 text-slate-400" />
                            {review.title}
                          </p>
                        </div>
                        <p className="text-slate-600 leading-relaxed italic text-sm">
                          &quot;{review.review}&quot;
                        </p>
                        <span className="text-xs text-slate-400 block font-medium">{review.date}</span>
                      </div>

                      <div className="flex flex-row md:flex-col items-center md:justify-center gap-4 md:border-l md:border-slate-100 md:pl-8 md:min-w-35">
                        <div className="text-center">
                          <span className="text-4xl font-black text-slate-800">{review.rating.toFixed(1)}</span>
                        </div>
                        <StarRating rating={review.rating} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => {
        const value = i + 1;
        if (value <= rating) {
          return <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />;
        } else if (value - 0.5 === rating) {
          return <StarHalf key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />;
        } else {
          return <Star key={i} className="h-5 w-5 text-slate-200" />;
        }
      })}
    </div>
  );
}
