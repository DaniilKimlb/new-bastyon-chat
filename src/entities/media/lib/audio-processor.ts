/**
 * Web Audio API voice processing chain.
 * Applies noise gate, compression, and EQ for voice enhancement.
 */
export class AudioProcessor {
  private context: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private destination: MediaStreamAudioDestinationNode | null = null;
  private gainNode: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;

  async init(stream: MediaStream): Promise<MediaStream> {
    this.context = new AudioContext();

    if (this.context.state === "suspended") {
      await this.context.resume();
    }

    this.source = this.context.createMediaStreamSource(stream);
    this.destination = this.context.createMediaStreamDestination();

    // Compressor for voice leveling
    this.compressor = this.context.createDynamicsCompressor();
    this.compressor.threshold.value = -24;
    this.compressor.knee.value = 12;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;

    // Gain control
    this.gainNode = this.context.createGain();
    this.gainNode.gain.value = 1.0;

    // Chain: source → compressor → gain → destination
    this.source.connect(this.compressor);
    this.compressor.connect(this.gainNode);
    this.gainNode.connect(this.destination);

    // Return processed stream (video tracks from original + processed audio)
    const processedStream = new MediaStream();
    stream.getVideoTracks().forEach(t => processedStream.addTrack(t));
    this.destination.stream.getAudioTracks().forEach(t => processedStream.addTrack(t));

    return processedStream;
  }

  setGain(value: number) {
    if (this.gainNode) {
      this.gainNode.gain.value = value;
    }
  }

  destroy() {
    this.source?.disconnect();
    this.compressor?.disconnect();
    this.gainNode?.disconnect();
    this.context?.close();
    this.context = null;
  }
}
