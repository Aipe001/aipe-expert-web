"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/store/store";
import { expertApi, SubmitKycDto } from "@/lib/api/expert";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const documentTypes = [
  { value: "aadhaar", label: "Aadhaar Card" },
  { value: "pan", label: "PAN Card" },
  { value: "passport", label: "Passport" },
  { value: "driving_license", label: "Driving License" },
  { value: "voter_id", label: "Voter ID" },
] as const;

export default function KycPage() {
  const router = useRouter();
  const { isAuthenticated, onboardingStatus } = useSelector(
    (state: RootState) => state.auth,
  );
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<SubmitKycDto>({
    documentType: "aadhaar",
    documentNumber: "",
    fullName: "",
    dateOfBirth: "",
    address: "",
    documentFrontUrl: "",
    documentBackUrl: "",
    selfieUrl: "",
  });

  if (!isAuthenticated) {
    router.replace("/");
    return null;
  }

  const kycStatus = onboardingStatus?.kyc?.status;
  const rejectionReason = onboardingStatus?.kyc?.rejectionReason;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await expertApi.submitKyc(formData);
      toast.success("KYC documents submitted successfully!");
      router.push("/kyc/pending");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit KYC");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">KYC Verification</h1>
        <p className="text-muted-foreground">
          Submit your identity documents for verification to start accepting
          bookings.
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
              <CardTitle className="text-lg">Identity Verification</CardTitle>
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
            Upload a government-issued ID and a selfie for verification.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select
                value={formData.documentType}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    documentType: value as SubmitKycDto["documentType"],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name (as on document)</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, fullName: e.target.value }))
                }
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentNumber">Document Number</Label>
              <Input
                id="documentNumber"
                value={formData.documentNumber}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    documentNumber: e.target.value,
                  }))
                }
                placeholder="Enter document number"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    dateOfBirth: e.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, address: e.target.value }))
                }
                placeholder="Enter your address"
                rows={3}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="documentFrontUrl">Document Front URL</Label>
                <Input
                  id="documentFrontUrl"
                  value={formData.documentFrontUrl}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      documentFrontUrl: e.target.value,
                    }))
                  }
                  placeholder="URL of front image"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="documentBackUrl">Document Back URL</Label>
                <Input
                  id="documentBackUrl"
                  value={formData.documentBackUrl}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      documentBackUrl: e.target.value,
                    }))
                  }
                  placeholder="URL of back image"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="selfieUrl">Selfie URL</Label>
              <Input
                id="selfieUrl"
                value={formData.selfieUrl}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    selfieUrl: e.target.value,
                  }))
                }
                placeholder="URL of selfie image"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-[#1C8AFF]"
              disabled={submitting}
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
