"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/store/store";
import { expertApi, KycTemplate, KycTemplateStep } from "@/lib/api/expert";
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
import { Loader2, ShieldCheck, AlertCircle, Upload, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface StepData {
  fieldValue?: string;
  documentFrontUrl?: string;
  documentBackUrl?: string;
  documentFrontName?: string;
  documentBackName?: string;
}

export default function KycPage() {
  const router = useRouter();
  const { isAuthenticated, onboardingStatus } = useSelector(
    (state: RootState) => state.auth,
  );
  const [template, setTemplate] = useState<KycTemplate | null>(null);
  const [stepData, setStepData] = useState<Record<string, StepData>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const kycStatus = onboardingStatus?.kyc?.status;
  const rejectionReason = onboardingStatus?.kyc?.rejectionReason;

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/");
      return;
    }
    (async () => {
      try {
        const tmpl = await expertApi.getKycTemplateByType("expert");
        if (tmpl) {
          setTemplate(tmpl);
          const initial: Record<string, StepData> = {};
          tmpl.steps.forEach((step) => {
            initial[step.id] = {};
          });
          setStepData(initial);
        }
      } catch (err) {
        console.error("Failed to load KYC template:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [isAuthenticated, router]);

  const updateStepData = (stepId: string, updates: Partial<StepData>) => {
    setStepData((prev) => ({
      ...prev,
      [stepId]: { ...prev[stepId], ...updates },
    }));
  };

  const handleFileChange = (step: KycTemplateStep, side: "front" | "back", e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (step.documentType?.allowedFileTypes) {
      const allowed = step.documentType.allowedFileTypes;
      if (!allowed.includes(file.type)) {
        toast.error(`Invalid file type. Allowed: ${allowed.map((t) => t.split("/")[1]).join(", ")}`);
        return;
      }
    }

    // For now, store as object URL (in production, upload to server first)
    const url = URL.createObjectURL(file);
    if (side === "front") {
      updateStepData(step.id, { documentFrontUrl: url, documentFrontName: file.name });
    } else {
      updateStepData(step.id, { documentBackUrl: url, documentBackName: file.name });
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
      const documents = template.steps.map((step) => {
        const data = stepData[step.id] || {};
        return {
          kycTemplateStepId: step.id,
          fieldValue: data.fieldValue || undefined,
          documentFrontUrl: data.documentFrontUrl || undefined,
          documentBackUrl: data.documentBackUrl || undefined,
        };
      });

      await expertApi.submitKycSubmission({
        kycTemplateId: template.id,
        documents,
      });
      toast.success("KYC documents submitted successfully!");
      router.push("/kyc/pending");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit KYC");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No KYC Template Available</h3>
            <p className="text-muted-foreground mt-2 text-center">
              KYC verification is not configured yet. Please contact support.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderStep = (step: KycTemplateStep) => {
    const data = stepData[step.id] || {};
    const stepIndex = [...template.steps].sort((a, b) => a.stepOrder - b.stepOrder).findIndex((s) => s.id === step.id);

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
            {/* Front / Single upload */}
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

            {/* Back side */}
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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">KYC Verification</h1>
        <p className="text-muted-foreground">
          {template.description || "Complete all required steps to verify your identity."}
        </p>
      </div>

      {kycStatus === "REJECTED" && rejectionReason && (
        <Card className="border-destructive bg-destructive/5">
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#1C8AFF]" />
              <CardTitle className="text-lg">{template.name}</CardTitle>
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
            Complete all {template.steps.filter((s) => s.required).length} required steps below.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}
