export function getMediaConstraints(
  audioDeviceId?: string | null,
  videoDeviceId?: string | null,
  videoEnabled = true
): MediaStreamConstraints {
  return {
    audio: audioDeviceId
      ? { deviceId: { exact: audioDeviceId } }
      : true,
    video: videoEnabled
      ? videoDeviceId
        ? { deviceId: { exact: videoDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
        : { width: { ideal: 1280 }, height: { ideal: 720 } }
      : false
  };
}

export function getScreenShareConstraints(): DisplayMediaStreamOptions {
  return {
    video: {
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 30 }
    },
    audio: true
  };
}
