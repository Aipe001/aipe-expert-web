import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type CallState = "idle" | "connecting" | "ringing" | "active" | "ended";
export type CallType = "audio" | "video";

interface CallInfo {
    bookingId: string;
    callType: CallType;
    status: CallState;
    startTime?: number;
    callerName?: string;
    isMuted: boolean;
    isVideoEnabled: boolean;
    isSpeakerEnabled: boolean;
    agoraAppId?: string;
    agoraToken?: string;
    agoraChannel?: string;
    agoraUid?: number;
    remoteUid?: number | null;
}

interface GlobalCallState {
    currentCall: CallInfo | null;
    incomingCall: {
        bookingId: string;
        callerName: string;
        callType: CallType;
        sessionId: string;
    } | null;
}

const initialState: GlobalCallState = {
    currentCall: null,
    incomingCall: null,
};

const callSlice = createSlice({
    name: "call",
    initialState,
    reducers: {
        setIncomingCall: (state, action: PayloadAction<GlobalCallState["incomingCall"]>) => {
            // Don't show incoming call if we're already in an active call for the same booking
            if (state.currentCall && state.currentCall.bookingId === action.payload?.bookingId && state.currentCall.status !== "idle") {
                return;
            }
            state.incomingCall = action.payload;
        },
        clearIncomingCall: (state) => {
            state.incomingCall = null;
        },
        initiateCall: (state, action: PayloadAction<{ bookingId: string; callType: CallType; callerName?: string }>) => {
            state.currentCall = {
                bookingId: action.payload.bookingId,
                callType: action.payload.callType,
                status: "connecting",
                callerName: action.payload.callerName,
                isMuted: false,
                isVideoEnabled: action.payload.callType === "video",
                isSpeakerEnabled: true,
            };
        },
        setCallStatus: (state, action: PayloadAction<CallState>) => {
            if (state.currentCall) {
                state.currentCall.status = action.payload;
                if (action.payload === "active" && !state.currentCall.startTime) {
                    state.currentCall.startTime = Date.now();
                }
                if (action.payload === "ended") {
                    // Keep it for a moment to show "Call ended" UI if needed, or clear it
                }
                if (action.payload === "idle") {
                    state.currentCall = null;
                }
            }
        },
        updateCallDetails: (state, action: PayloadAction<Partial<CallInfo>>) => {
            if (state.currentCall) {
                state.currentCall = { ...state.currentCall, ...action.payload };
            }
        },
        toggleMute: (state) => {
            if (state.currentCall) {
                state.currentCall.isMuted = !state.currentCall.isMuted;
            }
        },
        toggleVideo: (state) => {
            if (state.currentCall) {
                state.currentCall.isVideoEnabled = !state.currentCall.isVideoEnabled;
            }
        },
        toggleSpeaker: (state) => {
            if (state.currentCall) {
                state.currentCall.isSpeakerEnabled = !state.currentCall.isSpeakerEnabled;
            }
        },
        endCall: (state) => {
            if (state.currentCall) {
                state.currentCall.status = "ended";
            }
        },
        resetCall: (state) => {
            state.currentCall = null;
        },
    },
});

export const {
    setIncomingCall,
    clearIncomingCall,
    initiateCall,
    setCallStatus,
    updateCallDetails,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
    endCall,
    resetCall,
} = callSlice.actions;

export default callSlice.reducer;
