export interface MediaDeviceState {
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
  selectedAudioDevice: string | null;
  selectedVideoDevice: string | null;
}

export enum CallState {
  idle = "idle",
  ringing = "ringing",
  connecting = "connecting",
  connected = "connected",
  disconnected = "disconnected",
  failed = "failed"
}

export interface Participant {
  id: string;
  address: string;
  name: string;
  stream: MediaStream | null;
  audioEnabled: boolean;
  videoEnabled: boolean;
}
