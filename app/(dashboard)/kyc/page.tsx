
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/lib/store/store";
import { setOnboardingStatus } from "@/lib/store/slices/authSlice";
import { expertApi, KycTemplate, KycTemplateStep, BookAnExpertPlan, ExpertProfile } from "@/lib/api/expert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ShieldCheck, AlertCircle, Upload, CheckCircle2, Check, Clock } from "lucide-react";
import { toast } from "sonner";

interface StepData {
  fieldValue?: string;
  documentFrontUrl?: string;
  documentBackUrl?: string;
  documentFrontName?: string;
  documentBackName?: string;
  documentFrontFile?: File;
  documentBackFile?: File;
}

const STEPS = [
  { id: "expert-kyc", label: "Expert KYC" },
  { id: "subscription", label: "Book a Expert Subscription" },
  { id: "category-kyc", label: "Categories KYC" },
  { id: "bank-kyc", label: "Bank KYC" }
];

export default function KycPage() {
  const router = useRouter();
  const { isAuthenticated, onboardingStatus } = useSelector(
    (state: RootState) => state.auth,
  );
  const dispatch = useDispatch();

  const [activeTab, setActiveTab] = useState("expert-kyc");
  const [template, setTemplate] = useState<KycTemplate | null>(null);
  const [stepData, setStepData] = useState<Record<string, StepData>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [availablePlans, setAvailablePlans] = useState<BookAnExpertPlan[]>([]);
  const [subscribedPlanIds, setSubscribedPlanIds] = useState<Set<string>>(new Set());
  const [togglingPlanId, setTogglingPlanId] = useState<string | null>(null);

  const [localSubmissionStatus, setLocalSubmissionStatus] = useState<string | null>(null);

  const kycStatus = onboardingStatus?.kyc?.status || localSubmissionStatus;
  const rejectionReason = onboardingStatus?.kyc?.rejectionReason;

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/");
      return;
    }
    (async () => {
      try {
        const status = await expertApi.getOnboardingStatus();
        dispatch(setOnboardingStatus(status));

        if (["SUBMITTED", "UNDER_REVIEW", "VERIFIED"].includes(status.kyc?.status || "")) {
          // We no longer redirect to pending globally, handled inside the tabs now
        }

        const tmpl = await expertApi.getKycTemplateByType("expert");
        if (tmpl) {
          setTemplate(tmpl);
          const initial: Record<string, StepData> = {};
          
          try {
            const submissions = await expertApi.getMyKycSubmissions();
            const lastSub = submissions.find(s => s.kycTemplateId === tmpl.id);
            if (lastSub) {
              const subStatus = lastSub.status.toUpperCase();
              setLocalSubmissionStatus(subStatus);
              if (["APPROVED", "VERIFIED"].includes(subStatus)) {
                setActiveTab("subscription");
              }
            }

            if (lastSub && lastSub.documents) {
              tmpl.steps.forEach((step) => {
                const doc = lastSub.documents?.find(d => d.kycTemplateStepId === step.id);
                initial[step.id] = {
                  documentFrontUrl: doc?.documentFrontUrl,
                  documentBackUrl: doc?.documentBackUrl,
                  documentFrontName: doc?.documentOriginalName || (doc?.documentFrontUrl ? "Previously Submitted" : undefined),
                  documentBackName: doc?.documentBackUrl ? "Previously Submitted" : undefined,
                  fieldValue: doc?.fieldValue,
                };
              });
            } else {
              tmpl.steps.forEach((step) => {
                initial[step.id] = {};
              });
            }
          } catch (e) {
            tmpl.steps.forEach((step) => {
              initial[step.id] = {};
            });
          }
          setStepData(initial);
        }

        try {
          const [plans, profile] = await Promise.all([
            expertApi.getAvailableBookAnExpertPlans(),
            expertApi.getMyProfile(),
          ]);
          setAvailablePlans(plans || []);
          if (profile && profile.bookAnExpertSubscriptions) {
            setSubscribedPlanIds(new Set(profile.bookAnExpertSubscriptions.map(p => p.id)));
          }
        } catch (planError) {
          console.error("Failed to load plans", planError);
        }
      } catch (err) {
        console.error("Failed to load KYC template or status:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [isAuthenticated, router, dispatch]);

  const updateStepData = (stepId: string, updates: Partial<StepData>) => {
    setStepData((prev) => ({
      ...prev,
      [stepId]: { ...prev[stepId], ...updates },
    }));
  };

  const handleToggleSubscription = async (planId: string, isSubscribed: boolean) => {
    setTogglingPlanId(planId);
    try {
      if (isSubscribed) {
        await expertApi.unsubscribeBookAnExpert(planId);
        setSubscribedPlanIds(prev => {
          const next = new Set(prev);
          next.delete(planId);
          return next;
        });
        toast.success("Subscription removed");
      } else {
        await expertApi.subscribeBookAnExpert(planId);
        setSubscribedPlanIds(prev => {
          const next = new Set(prev);
          next.add(planId);
          return next;
        });
        toast.success("Successfully subscribed");
      }
    } catch (error) {
      toast.error("Failed to update subscription");
    } finally {
      setTogglingPlanId(null);
    }
  };

  const handleFileChange = (step: KycTemplateStep, side: "front" | "back", e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (step.documentType?.allowedFileTypes) {
      const allowed = step.documentType.allowedFileTypes;
      if (!allowed.includes(file.type)) {
        toast.error(`Invalid file type. Allowed: ${allowed.map((t) => t.split("/")[1]).join(", ")}`);
        return;
      }
    }

    const url = URL.createObjectURL(file);
    if (side === "front") {
      updateStepData(step.id, { documentFrontUrl: url, documentFrontName: file.name, documentFrontFile: file });
    } else {
      updateStepData(step.id, { documentBackUrl: url, documentBackName: file.name, documentBackFile: file });
    }
  };

  const isValid = (): boolean => {
    if (!template) return false;
    return template.steps
      .filter((s) => s.required)
      .every((step) => {
        const data = stepData[step.id];
        if (!data) return false;
        if (step.fieldType === "document") {
          const needsBack = step.documentType?.sides === "front_and_back";
          return !!data.documentFrontUrl && (!needsBack || !!data.documentBackUrl);
        }
        return !!data.fieldValue?.trim();
      });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!template || !isValid()) return;
    setSubmitting(true);
    try {
      const submissions = await Promise.all(template.steps.map(async (step) => {
        const data = stepData[step.id] || {};
        
        let frontUrl = data.documentFrontUrl;
        if (data.documentFrontFile) {
          const res = await expertApi.uploadFile(data.documentFrontFile);
          frontUrl = res.url;
        }

        let backUrl = data.documentBackUrl;
        if (data.documentBackFile) {
          const res = await expertApi.uploadFile(data.documentBackFile);
          backUrl = res.url;
        }

        return {
          kycTemplateStepId: step.id,
          fieldValue: data.fieldValue || undefined,
          documentFrontUrl: frontUrl && !frontUrl.startsWith("blob:") ? frontUrl : undefined,
          documentBackUrl: backUrl && !backUrl.startsWith("blob:") ? backUrl : undefined,
        };
      }));

      await expertApi.submitKycSubmission({
        kycTemplateId: template.id,
        submissions,
      });
      toast.success("KYC documents submitted successfully!");
      router.push("/kyc/pending");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit KYC");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep = (step: KycTemplateStep) => {
    const data = stepData[step.id] || {};
    const stepIndex = template ? [...template.steps].sort((a, b) => a.stepOrder - b.stepOrder).findIndex((s) => s.id === step.id) : 0;

    return (
      <div key={step.id} className="rounded-lg border p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {stepIndex + 1}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium">{step.name}</p>
              {step.required && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Required</Badge>}
            </div>
            {step.description && <p className="text-sm text-muted-foreground">{step.description}</p>}
          </div>
        </div>

        {step.fieldType === "document" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs mb-1.5 block">
                {step.documentType?.sides === "front_and_back" ? "Front Side" : "Document"}
              </Label>
              <input
                type="file"
                ref={(el) => { fileInputRefs.current[`${step.id}-front`] = el; }}
                className="hidden"
                accept={step.documentType?.allowedFileTypes?.join(",") || "image/*,application/pdf"}
                onChange={(e) => handleFileChange(step, "front", e)}
              />
              <button
                type="button"
                onClick={() => fileInputRefs.current[`${step.id}-front`]?.click()}
                className="flex w-full items-center gap-2 rounded-lg border-2 border-dashed p-3 text-sm transition-colors hover:border-primary/50 hover:bg-primary/5"
              >
                {data.documentFrontUrl ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="truncate">{data.documentFrontName || "Uploaded"}</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Click to upload</span>
                  </>
                )}
              </button>
            </div>

            {step.documentType?.sides === "front_and_back" && (
              <div>
                <Label className="text-xs mb-1.5 block">Back Side</Label>
                <input
                  type="file"
                  ref={(el) => { fileInputRefs.current[`${step.id}-back`] = el; }}
                  className="hidden"
                  accept={step.documentType?.allowedFileTypes?.join(",") || "image/*,application/pdf"}
                  onChange={(e) => handleFileChange(step, "back", e)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRefs.current[`${step.id}-back`]?.click()}
                  className="flex w-full items-center gap-2 rounded-lg border-2 border-dashed p-3 text-sm transition-colors hover:border-primary/50 hover:bg-primary/5"
                >
                  {data.documentBackUrl ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="truncate">{data.documentBackName || "Uploaded"}</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Click to upload</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : step.fieldType === "select" && step.options ? (
          <Select
            value={data.fieldValue || ""}
            onValueChange={(value) => updateStepData(step.id, { fieldValue: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${step.name}`} />
            </SelectTrigger>
            <SelectContent>
              {step.options.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            type={step.fieldType === "number" ? "number" : step.fieldType === "date" ? "date" : "text"}
            value={data.fieldValue || ""}
            onChange={(e) => updateStepData(step.id, { fieldValue: e.target.value })}
            placeholder={step.description || `Enter ${step.name}`}
          />
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Stepper UI Component
  const renderStepper = () => {
    return (
      <div className="mb-12 w-full mt-4 max-w-4xl mx-auto pb-4 overflow-visible">
        <div className="flex items-center justify-between w-full px-2 relative">
          {/* Connector Track */}
          <div className="absolute top-4 left-6 right-6 h-[2px] bg-muted" />

          {STEPS.map((step, index) => {
            const isActive = activeTab === step.id;
            // First step is verified if status is APPROVED/VERIFIED
            const isStep0Completed = index === 0 && ["APPROVED", "VERIFIED"].includes(localSubmissionStatus || "");
            const isStep1Completed = index === 1 && subscribedPlanIds.size > 0;
            const isCompleted = isStep0Completed || isStep1Completed || STEPS.findIndex(s => s.id === activeTab) > index;

            return (
              <div key={step.id} className="relative z-10 flex flex-col items-center flex-1 group" onClick={() => setActiveTab(step.id)}>
                {/* Connecting Line Progress (Overlay on track) */}
                {index < STEPS.length - 1 && (
                  <div className={`absolute top-4 left-[50%] w-full h-[2px] transition-colors -z-10 bg-transparent`} />
                )}
                
                {/* Step Circle */}
                <button 
                  className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 font-medium transition-colors cursor-pointer shrink-0
                    ${isActive ? "border-primary bg-primary text-primary-foreground" : 
                      isCompleted ? "border-primary bg-primary text-primary-foreground" : 
                      "border-muted bg-background text-muted-foreground hover:border-primary"}`}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : <span>{index + 1}</span>}
                </button>
                
                {/* Label */}
                <div className={`mt-3 w-40 text-center text-xs font-medium cursor-pointer transition-colors ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                  {step.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Onboarding Dashboard</h1>
        <p className="text-muted-foreground">
          Complete all required steps to verify your identity and setup your services.
        </p>
      </div>

      {kycStatus === "REJECTED" && rejectionReason && (
        <Card className="border-destructive bg-destructive/5 mb-6">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-destructive">KYC Rejected</p>
              <p className="text-sm text-muted-foreground mt-1">
                Reason: {rejectionReason}
              </p>
              <p className="text-sm text-muted-foreground">
                Please correct the issues and resubmit your documents.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {renderStepper()}

      <Card className="mt-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* We hide the default TabsList since we have the Stepper as custom tabs list */}
          <TabsList className="hidden">
            {STEPS.map((step) => (
              <TabsTrigger key={step.id} value={step.id}>{step.label}</TabsTrigger>
            ))}
          </TabsList>
          
          <TabsContent value="expert-kyc" className="mt-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-[#1C8AFF]" />
                  <CardTitle className="text-lg">{template?.name || "Expert KYC"}</CardTitle>
                </div>
                {kycStatus && (
                  <Badge
                    variant={
                      kycStatus === "VERIFIED"
                        ? "default"
                        : kycStatus === "REJECTED"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {kycStatus}
                  </Badge>
                )}
              </div>
              <CardDescription>
                Complete all {template?.steps.filter((s) => s.required).length || 0} required steps below.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!template ? (
                <div className="py-12 flex flex-col items-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">KYC template not available.</p>
                </div>
              ) : ["SUBMITTED", "UNDER_REVIEW"].includes(localSubmissionStatus || "") ? (
                <div className="py-12 flex flex-col items-center text-center">
                  <Clock className="h-12 w-12 text-primary mb-4" />
                  <h3 className="text-xl font-medium">KYC Under Review</h3>
                  <p className="text-muted-foreground mt-2 max-w-sm">
                    Your KYC documents have been submitted and are being reviewed by our team. This usually takes 24-48 hours.
                  </p>
                </div>
              ) : ["APPROVED", "VERIFIED"].includes(localSubmissionStatus || "") ? (
                <div className="py-12 flex flex-col items-center text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-600 mb-4" />
                  <h3 className="text-xl font-medium text-green-700">KYC Verified!</h3>
                  <p className="text-muted-foreground mt-2">
                    Your identity has been verified. You can proceed to the next step.
                  </p>
                  <Button className="mt-6" onClick={() => setActiveTab("subscription")}>Next Step</Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {[...template.steps]
                    .sort((a, b) => a.stepOrder - b.stepOrder)
                    .map(renderStep)}

                  <Button
                    type="submit"
                    className="w-full bg-[#1C8AFF]"
                    disabled={submitting || !isValid()}
                  >
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit KYC Documents
                  </Button>
                </form>
              )}
            </CardContent>
          </TabsContent>

          <TabsContent value="subscription" className="mt-0">
            <CardHeader>
              <CardTitle>Book a Expert Subscription</CardTitle>
              <CardDescription>Select and manage your subscription packages.</CardDescription>
            </CardHeader>
            <CardContent>
              {availablePlans.length === 0 ? (
                <div className="py-12 flex flex-col items-center text-center">
                  <p className="text-muted-foreground">No subscription plans available at the moment.</p>
                  <Button className="mt-4" onClick={() => setActiveTab("category-kyc")}>Next Step</Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {availablePlans.map((plan) => {
                      const isSubscribed = subscribedPlanIds.has(plan.id);
                      return (
                        <div key={plan.id} className={`rounded-xl border p-5 relative transition-colors ${isSubscribed ? "border-primary bg-primary/5" : "hover:border-primary/50"}`}>
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold">{plan.name}</h4>
                            {isSubscribed && <Badge variant="default" className="bg-primary/20 text-primary hover:bg-primary/20">Subscribed</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                          <div className="flex justify-between items-center mt-auto">
                            <span className="text-sm font-medium">
                              {plan.pricingTiers?.[0] ? `₹${plan.pricingTiers[0].price} / ${plan.pricingTiers[0].durationMinutes}m` : "Custom Pricing"}
                            </span>
                            <Button 
                              variant={isSubscribed ? "destructive" : "default"}
                              size="sm"
                              className={isSubscribed ? "" : "bg-[#1C8AFF] hover:bg-[#1C8AFF]/90"}
                              disabled={togglingPlanId === plan.id}
                              onClick={() => handleToggleSubscription(plan.id, isSubscribed)}
                            >
                              {togglingPlanId === plan.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              {isSubscribed ? "Remove" : "Subscribe"}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button onClick={() => setActiveTab("category-kyc")} disabled={subscribedPlanIds.size === 0}>
                      {subscribedPlanIds.size === 0 ? "Subscribe to continue" : "Next Step"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </TabsContent>

          <TabsContent value="category-kyc" className="mt-0">
            <CardHeader>
              <CardTitle>Categories KYC</CardTitle>
              <CardDescription>Verify your specific expertise categories.</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="py-12 flex flex-col items-center text-center">
                 <p className="text-muted-foreground">Category documents missing or optional (Placeholder)</p>
                 <Button className="mt-4" onClick={() => setActiveTab("bank-kyc")}>Next Step</Button>
              </div>
            </CardContent>
          </TabsContent>

          <TabsContent value="bank-kyc" className="mt-0">
            <CardHeader>
              <CardTitle>Bank KYC</CardTitle>
              <CardDescription>Link your bank account to receive payments securely.</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="py-12 flex flex-col items-center text-center">
                 <p className="text-muted-foreground">Bank specific KYC documents (Placeholder)</p>
                 <Button className="mt-4" variant="outline" onClick={() => setActiveTab("category-kyc")}>Go Back</Button>
              </div>
            </CardContent>
          </TabsContent>

        </Tabs>
      </Card>
    </div>
  );
}
