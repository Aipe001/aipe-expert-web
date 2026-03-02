"use client";

import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { loginSuccess } from "@/lib/store/slices/authSlice";

export function AuthInitializer() {
  const dispatch = useDispatch();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const userStr = localStorage.getItem("user");

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        dispatch(loginSuccess({ user, token }));
      } catch (error) {
        console.error("Failed to parse user from local storage", error);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
      }
    }
  }, [dispatch]);

  return null;
}
