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

  getWallet: async (): Promise<WalletInfo> => {
    return apiClient<WalletInfo>("/experts/wallet");
  },

  // getTransactions: async (): Promise<Transaction[]> => {
  //   return apiClient<Transaction[]>("/experts/transactions");  // this api doesnt exist
  // },

  requestWithdrawal: async (
    data: WithdrawalRequest,
  ): Promise<{ message: string }> => {
    return apiClient<{ message: string }>("/experts/withdraw", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};
