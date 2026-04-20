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

export interface PricingTier {
  durationMinutes: number;
  price: number;
}

export interface BookAnExpertPlan {
  id: string;
  name: string;
  description: string;
  pricingTiers: PricingTier[];
}

export interface ExpertProfile {
  id: string;
  status: string;
  userId: string;
  isVerified: boolean;
  isActive: boolean;
  bookAnExpertSubscriptions?: BookAnExpertPlan[];
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
  targetCategoryId?: string;
  targetCategory?: {
    id: string;
    name: string;
  };
  steps: KycTemplateStep[];
}

export interface KycSubmissionDocument {
  id: string;
  kycTemplateStepId: string;
  documentFrontUrl?: string;
  documentBackUrl?: string;
  documentOriginalName?: string;
  fieldValue?: string;
}

export interface KycSubmission {
  id: string;
  kycTemplateId: string;
  status: "draft" | "submitted" | "under_review" | "approved" | "rejected";
  rejectionReason?: string;
  reviewNote?: string;
  submittedAt?: string;
  documents?: KycSubmissionDocument[];
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
    return apiClient<WalletInfo>("/wallet");
  },

  requestWithdrawal: async (
    data: WithdrawalRequest,
  ): Promise<{ message: string }> => {
    return apiClient<{ message: string }>("/wallet/withdraw", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  getExpertReviews: async (expertId: string): Promise<any[]> => {
    return apiClient<any[]>(`/reviews/expert/${expertId}`);
  },

  // ── Book An Expert Subscriptions ────────────────────────────
  getAvailableBookAnExpertPlans: async (): Promise<BookAnExpertPlan[]> => {
    return apiClient<BookAnExpertPlan[]>("/book-an-expert/active");
  },

  getMyProfile: async (): Promise<ExpertProfile> => {
    return apiClient<ExpertProfile>("/experts/my/profile");
  },

  subscribeBookAnExpert: async (planId: string): Promise<{ message: string }> => {
    return apiClient<{ message: string }>(`/experts/my/book-an-expert/${planId}`, {
      method: "POST",
    });
  },

  unsubscribeBookAnExpert: async (planId: string): Promise<{ message: string }> => {
    return apiClient<{ message: string }>(`/experts/my/book-an-expert/${planId}`, {
      method: "DELETE",
    });
  },

  // ── KYC Templates & Submissions (new system) ────────────────
  getKycTemplateByType: async (kycType: string): Promise<KycTemplate | null> => {
    const templates = await apiClient<KycTemplate[]>(`/kyc-templates?kycType=${kycType}`);
    return templates.find((t) => t.isActive) || null;
  },

  getKycTemplatesByType: async (kycType: string): Promise<KycTemplate[]> => {
    const templates = await apiClient<KycTemplate[]>(`/kyc-templates?kycType=${kycType}`);
    return templates.filter((t) => t.isActive);
  },

  getMyKycSubmissions: async (): Promise<KycSubmission[]> => {
    return apiClient<KycSubmission[]>("/kyc-submissions/my");
  },

  submitKycSubmission: async (data: {
    kycTemplateId: string;
    targetId?: string;
    submissions: Array<{
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

  uploadFile: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient<{ url: string }>("/assets/upload", {
      method: "POST",
      body: formData,
    });
  },

  toggleAvailability: async (): Promise<{ isAvailable: boolean }> => {
    return apiClient<{ isAvailable: boolean }>("/experts/toggle-availability", {
      method: "PATCH",
    });
  },

  getExpertRating: async (expertId: string): Promise<{ average: number; count: number }> => {
    return apiClient<{ average: number; count: number }>(`/reviews/expert/${expertId}/rating`);
  },
};

