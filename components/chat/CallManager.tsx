"use client";

import { useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/lib/store/store";
import { setCallStatus, updateCallDetails, resetCall } from "@/lib/store/slices/callSlice";
import { toast } from "sonner";
import { agoraApi } from "@/lib/api/agora";

// Singleton to hold tracks globally
let globalLocalAudioTrack: any = null;
let globalLocalVideoTrack: any = null;
let globalAgoraClient: any = null;

export const getGlobalTracks = () => ({
    audioTrack: globalLocalAudioTrack,
    videoTrack: globalLocalVideoTrack,
    client: globalAgoraClient,
});

export function CallManager() {
    const dispatch = useDispatch<AppDispatch>();
    const { currentCall } = useSelector((state: RootState) => state.call);
    const activeCallPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (currentCall && currentCall.status === "active" && currentCall.agoraAppId && !globalAgoraClient) {
            joinChannel();
        }

        // Check if call was ended externally
        if (currentCall?.status === "active" && !activeCallPollRef.current) {
            activeCallPollRef.current = setInterval(async () => {
                try {
                    const { status } = await agoraApi.getCallStatus(currentCall.bookingId);
                    if (status === "ended" || status === "none") {
                        handleDisconnect();
                        dispatch(setCallStatus("ended"));
                        setTimeout(() => dispatch(resetCall()), 3000);
                    }
                } catch { }
            }, 5000);
        } else if (currentCall?.status !== "active" && activeCallPollRef.current) {
            clearInterval(activeCallPollRef.current);
            activeCallPollRef.current = null;
        }

        return () => {
            if (activeCallPollRef.current) clearInterval(activeCallPollRef.current);
        };
    }, [currentCall?.status, currentCall?.agoraToken]);

    const joinChannel = async () => {
        if (!currentCall || !currentCall.agoraAppId || !currentCall.agoraToken || !currentCall.agoraChannel) return;

        try {
            const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
            const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
            globalAgoraClient = client;

            client.on("user-published", async (remoteUser: any, mediaType: "audio" | "video") => {
                await client.subscribe(remoteUser, mediaType);
                dispatch(updateCallDetails({ remoteUid: remoteUser.uid as number }));

                if (mediaType === "audio") {
                    remoteUser.audioTrack?.play();
                }
                // Video track will be played by the component that gets the tracks
            });

            client.on("user-left", () => {
                dispatch(setCallStatus("ended"));
                handleDisconnect();
                setTimeout(() => dispatch(resetCall()), 1500);
            });

            await client.join(
                currentCall.agoraAppId,
                currentCall.agoraChannel,
                currentCall.agoraToken,
                currentCall.agoraUid || 0
            );

            const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
            globalLocalAudioTrack = audioTrack;

            if (currentCall.callType === "video") {
                const videoTrack = await AgoraRTC.createCameraVideoTrack();
                globalLocalVideoTrack = videoTrack;
                await client.publish([audioTrack, videoTrack]);
            } else {
                await client.publish([audioTrack]);
            }

            console.log("[CallManager] Joined & Published successfully");
        } catch (err) {
            console.error("[CallManager] Join error:", err);
            toast.error("Failed to connect to call");
            dispatch(setCallStatus("idle"));
        }
    };

    const handleDisconnect = async () => {
        if (globalLocalAudioTrack) {
            globalLocalAudioTrack.close();
            globalLocalAudioTrack = null;
        }
        if (globalLocalVideoTrack) {
            globalLocalVideoTrack.close();
            globalLocalVideoTrack = null;
        }
        if (globalAgoraClient) {
            try {
                await globalAgoraClient.leave();
            } catch { }
            globalAgoraClient = null;
        }
    };

    // Synchronize Mute/Video states from Redux to Agora
    useEffect(() => {
        if (globalLocalAudioTrack) {
            globalLocalAudioTrack.setEnabled(!currentCall?.isMuted);
        }
    }, [currentCall?.isMuted]);

    useEffect(() => {
        if (globalLocalVideoTrack) {
            globalLocalVideoTrack.setEnabled(currentCall?.isVideoEnabled ?? false);
        }
    }, [currentCall?.isVideoEnabled]);

    return null;
}
