import { ref, onMounted } from "vue";

export interface MediaDeviceInfo {
  deviceId: string;
  label: string;
  kind: "audioinput" | "videoinput" | "audiooutput";
}

export function useMediaDevices() {
  const audioDevices = ref<MediaDeviceInfo[]>([]);
  const videoDevices = ref<MediaDeviceInfo[]>([]);
  const audioOutputDevices = ref<MediaDeviceInfo[]>([]);

  const enumerateDevices = async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();

    audioDevices.value = devices
      .filter(d => d.kind === "audioinput")
      .map(d => ({ deviceId: d.deviceId, label: d.label || `Mic ${d.deviceId.slice(0, 4)}`, kind: d.kind as "audioinput" }));

    videoDevices.value = devices
      .filter(d => d.kind === "videoinput")
      .map(d => ({ deviceId: d.deviceId, label: d.label || `Camera ${d.deviceId.slice(0, 4)}`, kind: d.kind as "videoinput" }));

    audioOutputDevices.value = devices
      .filter(d => d.kind === "audiooutput")
      .map(d => ({ deviceId: d.deviceId, label: d.label || `Speaker ${d.deviceId.slice(0, 4)}`, kind: d.kind as "audiooutput" }));
  };

  onMounted(enumerateDevices);

  navigator.mediaDevices?.addEventListener("devicechange", enumerateDevices);

  return {
    audioDevices,
    audioOutputDevices,
    enumerateDevices,
    videoDevices
  };
}
