"use client";

import { motion } from "framer-motion";
import { Star, StarHalf, CheckCircle2, Award } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const reviews = [
  {
    id: "TIC-8842",
    userName: "Rahul Sharma",
    title: "Vastu Consultation for Home",
    rating: 5.0,
    review: "Excellent advice! The expert was very knowledgeable and provided practical remedies that were easy to implement. Highly recommend for anyone looking for authentic Vastu guidance.",
    date: "2 days ago",
  },
  {
    id: "TIC-8721",
    userName: "Priya Patel",
    title: "Career Astrology Reading",
    rating: 4.5,
    review: "Very insightful session. The predictions were quite accurate regarding my past career path. The remedies suggested are helpful.",
    date: "1 week ago",
  },
  {
    id: "TIC-8655",
    userName: "Amit Verma",
    title: "Business Name Numerology",
    rating: 5.0,
    review: "The analysis was very detailed. I feel much more confident about my new business name now. Great experience!",
    date: "2 weeks ago",
  },
];

export default function RatingsPage() {
  const averageRating = 4.9;
  const totalServices = 124;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

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
                   {[...Array(5)].map((_, i) => (
                     <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                   ))}
                </div>
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
          <h2 className="text-2xl font-bold text-slate-800">Recent Customer Reviews</h2>
          <span className="text-sm text-slate-500 font-medium">Showing latest {reviews.length} reviews</span>
        </div>

        <div className="space-y-4">
          {reviews.map((review) => (
            <motion.div key={review.id} variants={itemVariants}>
              <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Info Column */}
                    <div className="flex-1 space-y-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-[#1C8AFF] uppercase tracking-wider">Ticket #{review.id}</span>
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

                    {/* Rating Column (Right) */}
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
