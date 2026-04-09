import { apiClient } from "./client";

export enum ServiceType {
  ON_DEMAND = "on_demand",
  END_TO_END = "end_to_end",
}

export interface BookingRequest {
  id: string;
  customerId: string;
  serviceId?: string;
  bookAnExpertId?: string;
  expertId?: string;
  serviceType: ServiceType;
  productType: string;
  status: string;
  customerNotes?: string;
  createdAt: string;
  service?: {
    id: string;
    name: string;
    category?: { name: string };
  };
  bookAnExpert?: {
    id: string;
    name: string;
  };
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
}

export interface Booking {
  id: string;
  bookingNumber: string;
  userId: string;
  expertId?: string;
  serviceId: string;
  bookingRequestId?: string;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  baseAmount: number;
  serviceFee: number;
  gstAmount: number;
  totalAmount: number;
  notes?: string;
  cancellationReason?: string;
  cancelledAt?: string;
  completedAt?: string;
  startedAt?: string;
  createdAt: string;
  productType?: string;
  bookAnExpertId?: string;
  expert?: { id: string; firstName: string; lastName: string };
  service?: { id: string; name: string };
  bookAnExpert?: { id: string; name: string };
  user?: { id: string; firstName: string; lastName: string; phone: string };
}

export const getExpertBookingRequests = async (): Promise<BookingRequest[]> => {
  return apiClient<BookingRequest[]>("/bookings/requests/expert");
};

export const getExpertBookings = async (): Promise<Booking[]> => {
  return apiClient<Booking[]>("/bookings/expert");
};

export const acceptBookingRequest = async (id: string): Promise<BookingRequest> => {
  return apiClient<BookingRequest>(`/bookings/requests/${id}/accept`, {
    method: "PATCH",
  });
};

export const rejectBookingRequest = async (
  id: string,
  reason?: string,
): Promise<BookingRequest> => {
  return apiClient<BookingRequest>(`/bookings/requests/${id}/reject`, {
    method: "PATCH",
    body: JSON.stringify({ reason }),
  });
};

export const updateBookingStatus = async (
  id: string,
  status: string,
): Promise<Booking> => {
  return apiClient<Booking>(`/bookings/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
};

export const getBookingById = async (id: string): Promise<Booking> => {
  return apiClient<Booking>(`/bookings/${id}`);
};

