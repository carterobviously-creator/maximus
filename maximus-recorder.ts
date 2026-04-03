// Maximus V3 — TypeScript PCM Recorder (infinite length, perfect timing)

export class PCMRecorder {
    private buffers: Float32Array[] = [];
    private recording: boolean = false;
    private sampleRate: number;

    constructor(sampleRate: number) {
        this.sampleRate = sampleRate;
    }

    // Called from main thread when Worklet sends PCM samples
    addSamples(samples: Float32Array) {
        if (this.recording) {
            // Copy to avoid mutation
            this.buffers.push(new Float32Array(samples));
        }
    }

    start() {
        this.buffers = [];
        this.recording = true;
    }

    stop(): Blob {
        this.recording = false;

        // Merge all buffers
        const totalLength = this.buffers.reduce((sum, b) => sum + b.length, 0);
        const merged = new Float32Array(totalLength);

        let offset = 0;
        for (const b of this.buffers) {
            merged.set(b, offset);
            offset += b.length;
        }

        // Convert to WAV
        const wav = this.encodeWAV(merged);

        return new Blob([wav], { type: "audio/wav" });
    }

    private encodeWAV(samples: Float32Array): ArrayBuffer {
        const numChannels = 1;
        const bytesPerSample = 2; // 16-bit PCM
        const blockAlign = numChannels * bytesPerSample;
        const byteRate = this.sampleRate * blockAlign;

        const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
        const view = new DataView(buffer);

        // RIFF header
        this.writeString(view, 0, "RIFF");
        view.setUint32(4, 36 + samples.length * bytesPerSample, true);
        this.writeString(view, 8, "WAVE");

        // fmt chunk
        this.writeString(view, 12, "fmt ");
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true); // PCM
        view.setUint16(22, numChannels, true);
        view.setUint32(24, this.sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bytesPerSample * 8, true);

        // data chunk
        this.writeString(view, 36, "data");
        view.setUint32(40, samples.length * bytesPerSample, true);

        // Write PCM samples
        let offset = 44;
        for (let i = 0; i < samples.length; i++) {
            let s = Math.max(-1, Math.min(1, samples[i]));
            view.setInt16(offset, s * 0x7fff, true);
            offset += 2;
        }

        return buffer;
    }

    private writeString(view: DataView, offset: number, str: string) {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
    }
}
