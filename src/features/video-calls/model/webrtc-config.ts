import { RTC_HTTP_URL, RTC_WS_URL } from "@/shared/config";

export const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" }
];

export const SFU_CONFIG = {
  wsUrl: RTC_WS_URL,
  httpUrl: RTC_HTTP_URL
};

export function createPeerConnectionConfig(): RTCConfiguration {
  return {
    iceServers: ICE_SERVERS,
    iceCandidatePoolSize: 10
  };
}
