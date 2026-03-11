import { apiClient } from "./client";
import type { OnboardingStatus } from "@/lib/store/slices/authSlice";

export interface SubmitKycDto {
  documentType: "aadhaar" | "pan" | "passport" | "driving_license" | "voter_id";
  documentNumber: string;
  documentFrontUrl?: string;
  documentBackUrl?: string;
  selfieUrl?: string;
  fullName: string;
  dateOfBirth?: string;
  address?: string;
}

export interface WalletInfo {
  balance: number;
  currency: string;
}

export interface EarningsStats {
  totalEarnings: number;
  monthlyEarnings: number;
  pendingPayout: number;
  completedConsultations: number;
  rating: number;
  totalReviews: number;
}

export interface Transaction {
  id: string;
  type: "earning" | "withdrawal" | "refund";
  amount: number;
  status: string;
  description: string;
  createdAt: string;
}

export interface WithdrawalRequest {
  amount: number;
}

// ── KYC Templates & Submissions (new system) ────────────────
export interface KycDocumentTypeDef {
  id: string;
  name: string;
  code: string;
  allowedFileTypes: string[];
  sides: "front_only" | "front_and_back" | "single";
}

export interface KycTemplateStep {
  id: string;
  stepOrder: number;
  name: string;
  description?: string;
  documentTypeId?: string;
  documentType?: KycDocumentTypeDef;
  fieldType: string;
  required: boolean;
  options?: string[];
}

export interface KycTemplate {
  id: string;
  name: string;
  kycType: "expert" | "bank_approval" | "category_service";
  description?: string;
  isActive: boolean;
  steps: KycTemplateStep[];
}

export interface KycSubmission {
  id: string;
  kycTemplateId: string;
  status: "draft" | "submitted" | "under_review" | "approved" | "rejected";
  rejectionReason?: string;
  reviewNote?: string;
  submittedAt?: string;
}

export const expertApi = {
  getOnboardingStatus: async (): Promise<OnboardingStatus> => {
    return apiClient<OnboardingStatus>("/expert-onboarding/status");
  },

  submitKyc: async (
    data: SubmitKycDto,
  ): Promise<{ message: string; onboardingStep: number }> => {
    return apiClient<{ message: string; onboardingStep: number }>(
      "/expert-onboarding/kyc",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  },

  getEarningsStats: async (): Promise<EarningsStats> => {
    return apiClient<EarningsStats>("/experts/statistics");
  },

  getTransactions: async (): Promise<Transaction[]> => {
    return apiClient<Transaction[]>("/wallet/transactions");
  },

  getWallet: async (): Promise<WalletInfo> => {
    return apiClient<WalletInfo>("/experts/wallet");
  },

  requestWithdrawal: async (
    data: WithdrawalRequest,
  ): Promise<{ message: string }> => {
    return apiClient<{ message: string }>("/experts/withdraw", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // ── KYC Templates & Submissions (new system) ────────────────
  getKycTemplateByType: async (kycType: string): Promise<KycTemplate | null> => {
    const templates = await apiClient<KycTemplate[]>(`/kyc-templates?kycType=${kycType}`);
    return templates.find((t) => t.isActive) || null;
  },

  getMyKycSubmissions: async (): Promise<KycSubmission[]> => {
    return apiClient<KycSubmission[]>("/kyc-submissions/my");
  },

  submitKycSubmission: async (data: {
    kycTemplateId: string;
    targetId?: string;
    documents: Array<{
      kycTemplateStepId: string;
      fieldValue?: string;
      documentFrontUrl?: string;
      documentBackUrl?: string;
    }>;
  }): Promise<{ message: string }> => {
    return apiClient<{ message: string }>("/kyc-submissions/submit", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

