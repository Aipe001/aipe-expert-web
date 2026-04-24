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
let globalLocalScreenTrack: any = null;
let globalAgoraClient: any = null;

export const getGlobalTracks = () => ({
    audioTrack: globalLocalAudioTrack,
    videoTrack: globalLocalVideoTrack,
    screenTrack: globalLocalScreenTrack,
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

        if (currentCall?.status === "ended" && globalAgoraClient) {
            console.log("[CallManager] Call ended, disconnecting...");
            handleDisconnect();
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
                console.log("[CallManager] user-published event:", remoteUser.uid, mediaType);

                const isAdmin = remoteUser.uid === 9999;

                // If this is the Admin user (9999) and they published 'video', purposefully ignore it 
                // so we don't break the 1v1 video call UI layout
                if (isAdmin && mediaType === "video") {
                    console.log("[CallManager] Ignoring Admin video track to preserve 1v1 UI layout");
                    return;
                }

                await client.subscribe(remoteUser, mediaType);
                console.log("[CallManager] Subscribed to remote user:", remoteUser.uid, mediaType, "hasVideoTrack:", !!remoteUser.videoTrack, "hasAudioTrack:", !!remoteUser.audioTrack);

                const update: any = {};
                
                if (isAdmin) {
                    if (mediaType === "audio") {
                        toast("🛡️ Service Manager has joined the audio", { position: "top-center" });
                        update.adminInAudio = true;
                    }
                } else {
                    update.remoteUid = remoteUser.uid as number;
                    if (mediaType === "video") {
                        update.remoteVideoVersion = Date.now();
                    }
                }
                
                dispatch(updateCallDetails(update));

                if (mediaType === "audio") {
                    remoteUser.audioTrack?.play();
                }
                // Video track will be played by the component that gets the tracks
            });

            client.on("user-unpublished", (remoteUser: any, mediaType: "audio" | "video") => {
                console.log("[CallManager] Remote user unpublished:", remoteUser.uid, mediaType);
                if (mediaType === "video") {
                    // Bump version to force re-render (they might be switching to/from screen share)
                    dispatch(updateCallDetails({ remoteVideoVersion: Date.now() }));
                }
            });

            client.on("user-left", (remoteUser: any) => {
                console.log("[CallManager] Remote user left:", remoteUser?.uid);

                if (remoteUser?.uid === 9999) {
                    toast("🛡️ Service Manager left the audio", { position: "top-center" });
                    dispatch(updateCallDetails({ adminInAudio: false }));
                    return;
                }

                dispatch(setCallStatus("ended"));
                handleDisconnect();
                setTimeout(() => dispatch(resetCall()), 1500);
            });

            console.log("[CallManager] Joining channel:", currentCall.agoraChannel, "with uid:", currentCall.agoraUid);
            await client.join(
                currentCall.agoraAppId,
                currentCall.agoraChannel,
                currentCall.agoraToken,
                currentCall.agoraUid || 0
            );
            console.log("[CallManager] Joined channel successfully");

            const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
            globalLocalAudioTrack = audioTrack;

            if (currentCall.callType === "video") {
                const videoTrack = await AgoraRTC.createCameraVideoTrack();
                globalLocalVideoTrack = videoTrack;
                await client.publish([audioTrack, videoTrack]);
            } else {
                await client.publish([audioTrack]);
            }

            dispatch(updateCallDetails({ isLocalStreamActive: true }));
            console.log("[CallManager] Joined & Published successfully");

            // Subscribe to any remote users already in the channel
            const existingUsers = client.remoteUsers;
            console.log("[CallManager] Existing remote users after join:", existingUsers.length);
            for (const remoteUser of existingUsers) {
                const isAdmin = remoteUser.uid === 9999;
                if (remoteUser.hasAudio && !remoteUser.audioTrack) {
                    try {
                        await client.subscribe(remoteUser, "audio");
                        if (remoteUser.audioTrack) {
                            (remoteUser.audioTrack as any).play();
                        }
                        if (isAdmin) {
                            toast("🛡️ Service Manager is in the audio channel", { position: "top-center" });
                            dispatch(updateCallDetails({ adminInAudio: true }));
                        }
                        console.log("[CallManager] Subscribed to existing user audio:", remoteUser.uid);
                    } catch (e) {
                        console.warn("[CallManager] Failed to subscribe to existing audio:", e);
                    }
                }
                
                if (!isAdmin && remoteUser.hasVideo && !remoteUser.videoTrack) {
                    try {
                        await client.subscribe(remoteUser, "video");
                        console.log("[CallManager] Subscribed to existing user video:", remoteUser.uid);
                    } catch (e) {
                        console.warn("[CallManager] Failed to subscribe to existing video:", e);
                    }
                }
                
                if (!isAdmin && (remoteUser.hasAudio || remoteUser.hasVideo)) {
                    dispatch(updateCallDetails({
                        remoteUid: remoteUser.uid as number,
                        remoteVideoVersion: Date.now(),
                    }));
                }
            }
        } catch (err) {
            console.error("[CallManager] Join error:", err);
            toast.error("Failed to connect to call");
            dispatch(setCallStatus("idle"));
        }
    };

    const handleDisconnect = async () => {
        dispatch(updateCallDetails({ isLocalStreamActive: false }));
        if (globalLocalAudioTrack) {
            globalLocalAudioTrack.close();
            globalLocalAudioTrack = null;
        }
        if (globalLocalVideoTrack) {
            globalLocalVideoTrack.close();
            globalLocalVideoTrack = null;
        }
        if (globalLocalScreenTrack) {
            globalLocalScreenTrack.close();
            globalLocalScreenTrack = null;
        }
        if (globalAgoraClient) {
            try {
                await globalAgoraClient.leave();
            } catch { }
            globalAgoraClient = null;
        }
    };

    // Handle Screen Sharing toggle
    useEffect(() => {
        const handleScreenShareToggle = async () => {
            if (!globalAgoraClient || currentCall?.status !== "active") return;

            try {
                const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;

                if (currentCall.isScreenSharing) {
                    console.log("[CallManager] Starting screen share...");
                    // 1. Create screen track
                    const track = await AgoraRTC.createScreenVideoTrack({}, "auto");
                    const screenTrack = (Array.isArray(track) ? track[0] : track) as any;
                    globalLocalScreenTrack = screenTrack;

                    // 2. Handle "Stop Sharing" from browser UI
                    screenTrack.on("track-ended", () => {
                        console.log("[CallManager] Screen share track ended by user");
                        dispatch(updateCallDetails({ isScreenSharing: false }));
                    });

                    // 3. Unpublish camera if active
                    if (globalLocalVideoTrack) {
                        await globalAgoraClient.unpublish([globalLocalVideoTrack]);
                    }

                    // 4. Publish screen
                    await globalAgoraClient.publish([screenTrack]);
                    console.log("[CallManager] Screen share published");
                } else {
                    console.log("[CallManager] Stopping screen share...");
                    // 1. Unpublish and close screen track
                    if (globalLocalScreenTrack) {
                        try {
                            await globalAgoraClient.unpublish([globalLocalScreenTrack]);
                        } catch { }
                        globalLocalScreenTrack.close();
                        globalLocalScreenTrack = null;
                    }

                    // 2. Restore camera if enabled
                    if (currentCall.isVideoEnabled && globalLocalVideoTrack) {
                        await globalAgoraClient.publish([globalLocalVideoTrack]);
                        console.log("[CallManager] Camera restored after screen share");
                    }
                }
            } catch (err) {
                console.error("[CallManager] Screen share error:", err);
                dispatch(updateCallDetails({ isScreenSharing: false }));
                // If it failed to start, try to restore camera
                if (currentCall?.isVideoEnabled && globalLocalVideoTrack && !globalLocalVideoTrack.isPublished) {
                    globalAgoraClient?.publish([globalLocalVideoTrack]).catch(() => { });
                }
            }
        };

        handleScreenShareToggle();
    }, [currentCall?.isScreenSharing]);

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
