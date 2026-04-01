import { apiClient } from './client';

export interface ChatMessage {
  id: string;
  bookingId: string;
  senderId: string;
  content: string;
  messageType: string;
  createdAt: string;
  sender?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface AgoraSession {
  id: string;
  bookingId: string;
  chatChannelId: string;
  rtcChannelName: string;
  sessionType: string;
  status: string;
  callerUserId?: string;
}

export interface RtcTokenResponse {
  token: string;
  channelName: string;
  appId: string;
}

export interface CallStatus {
  status: string;
  session: AgoraSession | null;
  token: string | null;
  channelName: string | null;
  appId: string | null;
  uid: number | null;
}

export interface CallInitiateResponse extends AgoraSession {
  token: string;
  channelName: string;
  appId: string;
  uid: number;
}

export const agoraApi = {
  getSessionByBooking: async (bookingId: string): Promise<AgoraSession | null> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await apiClient<any>(`/agora/sessions/booking/${bookingId}`);
    if (!result || result.found === false) return null;
    return result as AgoraSession;
  },

  createSession: async (bookingId: string, sessionType: string): Promise<AgoraSession> => {
    return apiClient<AgoraSession>('/agora/sessions', {
      method: 'POST',
      body: JSON.stringify({ bookingId, sessionType }),
    });
  },

  getRtcToken: async (sessionId: string): Promise<RtcTokenResponse> => {
    return apiClient<RtcTokenResponse>(`/agora/sessions/${sessionId}/rtc-token`, {
      method: 'POST',
    });
  },

  startSession: async (sessionId: string): Promise<AgoraSession> => {
    return apiClient<AgoraSession>(`/agora/sessions/${sessionId}/start`, {
      method: 'PATCH',
    });
  },

  endSession: async (sessionId: string): Promise<AgoraSession> => {
    return apiClient<AgoraSession>(`/agora/sessions/${sessionId}/end`, {
      method: 'PATCH',
    });
  },

  initiateCall: async (bookingId: string, callType: 'audio' | 'video' = 'audio'): Promise<CallInitiateResponse> => {
    return apiClient<CallInitiateResponse>(`/agora/call/${bookingId}/initiate`, {
      method: 'POST',
      body: JSON.stringify({ callType }),
    });
  },

  acceptCall: async (bookingId: string): Promise<CallInitiateResponse> => {
    return apiClient<CallInitiateResponse>(`/agora/call/${bookingId}/accept`, {
      method: 'POST',
    });
  },

  rejectCall: async (bookingId: string): Promise<AgoraSession> => {
    return apiClient<AgoraSession>(`/agora/call/${bookingId}/reject`, {
      method: 'POST',
    });
  },

  getCallStatus: async (bookingId: string): Promise<CallStatus> => {
    return apiClient<CallStatus>(`/agora/call/${bookingId}/status`);
  },

  sendMessage: async (bookingId: string, content: string): Promise<ChatMessage> => {
    return apiClient<ChatMessage>(`/agora/chat/${bookingId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  getMessages: async (bookingId: string, after?: string): Promise<ChatMessage[]> => {
    const query = after ? `?after=${encodeURIComponent(after)}` : '';
    return apiClient<ChatMessage[]>(`/agora/chat/${bookingId}/messages${query}`);
  },
};
