// Scheduler must live INSIDE the worklet
function getSectionAtTime(timeSeconds, style) {
    const bpm = style.bpm;
    const secondsPerBeat = 60 / bpm;
    const beatsPerBar = 4;
    const barsPerSection = 8;
    const sectionLength = secondsPerBeat * beatsPerBar * barsPerSection;

    const index = Math.floor(timeSeconds / sectionLength);
    const loopedIndex = index % style.structure.length;
    const name = style.structure[loopedIndex];

    const evolution = Math.min(1, timeSeconds / (style.lengthSeconds || 180));

    return {
        name,
        evolution,
        index: loopedIndex
    };
}

// ⭐ REQUIRED — this is the line your IDE deleted
class MaximusProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.time = 0;
        this.style = null;

        this.port.onmessage = (event) => {
            const msg = event.data;

            if (msg.type === "init") {
                this.style = msg.style;
                this.time = 0;
            }

            if (msg.type === "stop") {
                this.style = null;
            }
        };
    }

    hasGenre(g) {
        return this.style && this.style.genres.includes(g);
    }

    process(inputs, outputs, parameters) {
        const output = outputs[0];
        const channel = output[0];

        if (!this.style) {
            for (let i = 0; i < channel.length; i++) channel[i] = 0;
            return true;
        }

        const style = this.style;
        const sr = sampleRate;
        const bpm = style.bpm;
        const secondsPerBeat = 60 / bpm;
        const beatsPerBar = 4;
        const barLength = secondsPerBeat * beatsPerBar;

        for (let i = 0; i < channel.length; i++) {
            const t = this.time;
            const beat = t / secondsPerBeat;
            const bar = t / barLength;
            const beatInBar = beat % beatsPerBar;

            const section = getSectionAtTime(t, style);
            const sectionName = section.name;
            const evolution = section.evolution;

            let drums = 0, bass = 0, synth = 0, vocal = 0;

            // -----------------------------
            // DRUMS
            // -----------------------------
            let kick = 0, snare = 0, hat = 0;

            if (this.hasGenre("drum and bass")) {
                if (Math.abs(beatInBar - 0) < 0.04 || Math.abs(beatInBar - 1.5) < 0.04)
                    kick = Math.sin(2 * Math.PI * 60 * t) * Math.exp(-(t % secondsPerBeat) * 22);

                if (Math.abs(beatInBar - 1) < 0.04 || Math.abs(beatInBar - 2.5) < 0.04)
                    snare = (Math.random() * 2 - 1) * 0.5 * Math.exp(-(t % secondsPerBeat) * 26);

                if (Math.floor(beat * 4) % 2 === 0)
                    hat = (Math.random() * 2 - 1) * 0.16;
            }

            if (this.hasGenre("trap") || this.hasGenre("drill")) {
                if (Math.abs(beatInBar - 0) < 0.05 || Math.abs(beatInBar - 2) < 0.05)
                    kick += Math.sin(2 * Math.PI * 50 * t) * Math.exp(-(t % secondsPerBeat) * 18);

                if (Math.abs(beatInBar - 1) < 0.05 || Math.abs(beatInBar - 3) < 0.05)
                    snare += (Math.random() * 2 - 1) * 0.4 * Math.exp(-(t % secondsPerBeat) * 22);

                if (Math.floor(beat * 8) % 2 === 0)
                    hat += (Math.random() * 2 - 1) * 0.12;
            }

            drums = kick + snare + hat;

            // -----------------------------
            // BASS
            // -----------------------------
            let baseFreq = 55;
            if (this.hasGenre("drum and bass")) baseFreq = 80;
            if (this.hasGenre("trap") || this.hasGenre("drill")) baseFreq = 45;
            if (this.hasGenre("edm") || this.hasGenre("house")) baseFreq = 60;

            let bassEnv = Math.max(0, Math.sin(Math.PI * (beatInBar / beatsPerBar)));
            bass = Math.sin(2 * Math.PI * baseFreq * t) * bassEnv * 0.4;

            // -----------------------------
            // SYNTH
            // -----------------------------
            let synthFreq = 220;
            let mod = 1 + 0.1 * Math.sin(2 * Math.PI * (t / (barLength * 4)));
            synth = Math.sin(2 * Math.PI * synthFreq * mod * t) * 0.4;

            // -----------------------------
            // VOCAL-LIKE
            // -----------------------------
            if (style.vocals && (sectionName.includes("verse") || sectionName.includes("chorus"))) {
                let vowelFreq = 300 + 200 * Math.sin(t * 0.5);
                let f1 = Math.sin(2 * Math.PI * vowelFreq * t);
                let f2 = Math.sin(2 * Math.PI * vowelFreq * 2.5 * t);
                vocal = (f1 * 0.4 + f2 * 0.2) * 0.3;
            }

            // -----------------------------
            // MIX
            // -----------------------------
            let sample = drums + bass + synth + vocal;
            sample *= 0.6;

            channel[i] = sample;
            this.time += 1 / sr;
        }

        return true;
    }
}

// ⭐ REQUIRED — registers the processor so the browser can use it
registerProcessor("maximus-processor", MaximusProcessor);
