"use client";

import { useEffect, useState, ComponentType } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { RootState } from "@/lib/store/store";
import { setOnboardingStatus } from "@/lib/store/slices/authSlice";
import { expertApi } from "@/lib/api/expert";
import { Loader2 } from "lucide-react";

interface WithExpertAuthOptions {
  requireKyc?: boolean;
}

export function withExpertAuth<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: WithExpertAuthOptions = {},
) {
  const { requireKyc = true } = options;

  return function AuthenticatedComponent(props: P) {
    const router = useRouter();
    const dispatch = useDispatch();
    const { isAuthenticated, user, onboardingStatus } = useSelector(
      (state: RootState) => state.auth,
    );
    const [checking, setChecking] = useState(true);

    useEffect(() => {
      if (!isAuthenticated) {
        router.replace("/");
        return;
      }

      const checkExpertStatus = async () => {
        try {
          const status = await expertApi.getOnboardingStatus();
          dispatch(setOnboardingStatus(status));

          if (requireKyc) {
            const kycStatus = status.kyc?.status;
            if (!kycStatus || kycStatus === "PENDING") {
              router.replace("/kyc");
              return;
            }
            if (kycStatus === "SUBMITTED" || kycStatus === "UNDER_REVIEW") {
              router.replace("/kyc/pending");
              return;
            }
            if (kycStatus === "REJECTED") {
              router.replace("/kyc");
              return;
            }
          }

          setChecking(false);
        } catch {
          router.replace("/");
        }
      };

      checkExpertStatus();
    }, [isAuthenticated, user, router, dispatch]);

    if (checking || !isAuthenticated) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (requireKyc && onboardingStatus?.kyc?.status !== "VERIFIED") {
      return (
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };
}
