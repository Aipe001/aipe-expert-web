"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/store/store";
import { motion } from "framer-motion";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  GraduationCap, 
  Languages, 
  Star, 
  ShieldCheck, 
  Building2, 
  FileText, 
  Receipt,
  ArrowUpRight,
  BadgeCheck,
  Globe
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { expertApi, EarningsStats } from "@/lib/api/expert";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const { user, onboardingStatus } = useSelector((state: RootState) => state.auth);
  const [stats, setStats] = useState<EarningsStats | null>(null);
  const [loading, setLoading] = useState(true);

  const expertData = onboardingStatus?.expert;
  const kycStatus = onboardingStatus?.kyc?.status || "pending";
  const bankStatus = onboardingStatus?.bankDetail?.status || "pending";

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await expertApi.getEarningsStats();
        setStats(data);
      } catch (err) {
        console.error("Failed to fetch expert stats", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  const services = [
    { name: "ITR Filing", icon: <FileText className="h-5 w-5" />, color: "text-blue-600", bg: "bg-blue-50" },
    { name: "GST Filing", icon: <Receipt className="h-5 w-5" />, color: "text-emerald-600", bg: "bg-emerald-50" },
    { name: "Company Registration", icon: <Building2 className="h-5 w-5" />, color: "text-purple-600", bg: "bg-purple-50" },
    { name: "ROC Compliance", icon: <ShieldCheck className="h-5 w-5" />, color: "text-amber-600", bg: "bg-amber-50" },
    { name: "Financial Advisory", icon: <Globe className="h-5 w-5" />, color: "text-indigo-600", bg: "bg-indigo-50" },
    { name: "Audit Support", icon: <BadgeCheck className="h-5 w-5" />, color: "text-rose-600", bg: "bg-rose-50" },
  ];

  return (
    <motion.div 
      className="max-w-4xl mx-auto space-y-8 pb-10"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Profile Header */}
      <motion.div variants={itemVariants} className="relative">
        <div className="h-32 w-full bg-gradient-to-r from-[#1C8AFF] to-[#0A5BC4] rounded-3xl" />
        <div className="px-6 -mt-12 flex flex-col md:flex-row items-end gap-4 md:gap-6">
          <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-background ring-2 ring-[#1C8AFF]/20 shadow-xl rounded-2xl">
            <AvatarImage src={expertData?.avatarUrl || user?.profilePhoto} />
            <AvatarFallback className="bg-[#1C8AFF] text-white text-3xl font-bold rounded-2xl">
              {user?.firstName?.[0]}{user?.lastName?.[0] || "E"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 pb-2 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                {user?.firstName} {user?.lastName}
              </h1>
              <Badge variant="secondary" className="bg-[#1C8AFF]/10 text-[#1C8AFF] hover:bg-[#1C8AFF]/20 border-none px-3">
                Expert Professional
              </Badge>
              {kycStatus === "approved" && (
                <Badge className="bg-emerald-500 text-white border-none gap-1">
                  <ShieldCheck className="h-3 w-3" /> Verified
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground flex items-center gap-1.5 text-sm md:text-base font-medium">
              <Briefcase className="h-4 w-4" /> 
              {expertData?.qualifications?.[0] || "Financial Consultant"} • {expertData?.experienceYears || "5+"} Years Experience
            </p>
          </div>
          <div className="hidden md:flex gap-2 pb-2">
            <button className="px-4 py-2 bg-[#1C8AFF] text-white rounded-xl font-semibold shadow-lg shadow-[#1C8AFF]/20 hover:bg-[#0A5BC4] transition-all flex items-center gap-2">
              Share Profile <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Stats Bar */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard 
          label="Overall Rating" 
          value={stats?.rating?.toFixed(1) || "4.8"} 
          subText={`${stats?.totalReviews || 0} reviews`} 
          icon={<Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />}
        />
        <StatsCard 
          label="Experience" 
          value={`${expertData?.experienceYears || 5}+`} 
          subText="Years in field" 
          icon={<Briefcase className="h-5 w-5 text-blue-500" />}
        />
        <StatsCard 
          label="Consultations" 
          value={`${stats?.completedConsultations || 0}`} 
          subText="Clients served" 
          icon={<User className="h-5 w-5 text-purple-500" />}
        />
        <StatsCard 
          label="Location" 
          value={expertData?.city || "Mumbai"} 
          subText={expertData?.state || "Maharashtra"} 
          icon={<MapPin className="h-5 w-5 text-rose-500" />}
        />
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          {/* Bio Section */}
          <motion.div variants={itemVariants}>
            <Card className="border-none shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <User className="h-5 w-5 text-[#1C8AFF]" /> Professional Bio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    {expertData?.bio || `${user?.firstName} is a highly skilled professional with expertise in Indian financial systems. Dedicated to providing precise and reliable services in tax filings, business compliance, and financial consultations.`}
                  </p>
                  <p>
                    With over {expertData?.experienceYears || 5} years of experience in the industry, {user?.firstName} has helped numerous clients navigate through complex regulatory requirements with ease and efficiency.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Services Portfolio */}
          <motion.div variants={itemVariants}>
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="text-xl font-bold tracking-tight">Services Offered</h2>
              <Badge variant="ghost" className="text-[#1C8AFF] font-bold">India Only</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {services.map((service, index) => (
                <motion.div 
                  key={index}
                  whileHover={{ y: -5 }}
                  className="p-5 rounded-2xl bg-card border shadow-sm hover:shadow-md transition-all group"
                >
                  <div className={cn("p-2.5 rounded-xl inline-flex items-center justify-center mb-4", service.bg, service.color)}>
                    {service.icon}
                  </div>
                  <h3 className="font-bold text-lg mb-1 group-hover:text-[#1C8AFF] transition-colors">{service.name}</h3>
                  <p className="text-sm text-muted-foreground leading-snug">
                    Professional assistance for all your {service.name.toLowerCase()} requirements in India.
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        <div className="space-y-8">
          {/* Contact Details */}
          <motion.div variants={itemVariants}>
            <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold">Contact Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ContactItem icon={<Mail className="h-4 w-4" />} label="Email" value={user?.email || "Not provided"} />
                <ContactItem icon={<Phone className="h-4 w-4" />} label="Mobile" value={user?.mobile || "Not provided"} />
                <ContactItem icon={<Globe className="h-4 w-4" />} label="Availability" value="Mon - Sat, 10 AM - 7 PM" />
              </CardContent>
            </Card>
          </motion.div>

          {/* Qualifications & Languages */}
          <motion.div variants={itemVariants}>
            <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-purple-500" /> Qualifications
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="space-y-2">
                  {expertData?.qualifications?.map((qual, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground bg-secondary/50 p-2 rounded-lg">
                      <div className="mt-1 h-1.5 w-1.5 rounded-full bg-[#1C8AFF]" />
                      {qual}
                    </div>
                  )) || (
                    <div className="text-sm text-muted-foreground italic">Professional Finance Expert</div>
                  )}
                </div>
              </CardContent>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Languages className="h-5 w-5 text-emerald-500" /> Languages
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {["English", "Hindi", "Marathi"].map((lang) => (
                  <Badge key={lang} variant="outline" className="bg-secondary/30">{lang}</Badge>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Verification Status */}
          <motion.div variants={itemVariants}>
             <Card className="border-none bg-gradient-to-br from-[#1C8AFF]/5 to-[#1C8AFF]/10 shadow-sm overflow-hidden border-[#1C8AFF]/10">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 rounded-lg">
                      <ShieldCheck className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">KYC Verified</h4>
                      <p className="text-xs text-muted-foreground capitalize">{kycStatus} status</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Building2 className="h-5 w-5 text-[#1C8AFF]" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">Bank Verification</h4>
                      <p className="text-xs text-muted-foreground capitalize">{bankStatus} status</p>
                    </div>
                  </div>
                </CardContent>
             </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

function StatsCard({ label, value, subText, icon }: { label: string, value: string, subText: string, icon: React.ReactNode }) {
  return (
    <Card className="border-none shadow-sm bg-card/40 backdrop-blur-sm">
      <CardContent className="p-5 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
          {icon}
        </div>
        <div className="space-y-0.5">
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          <p className="text-xs text-muted-foreground">{subText}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ContactItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 group">
      <div className="p-2 rounded-lg bg-secondary/50 group-hover:bg-[#1C8AFF]/10 group-hover:text-[#1C8AFF] transition-colors">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">{label}</p>
        <p className="text-sm font-semibold truncate text-foreground/80">{value}</p>
      </div>
    </div>
  );
}
