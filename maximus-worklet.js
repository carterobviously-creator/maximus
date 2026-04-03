class MaximusProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.sampleRate = sampleRate;
        this.style = null;
        this.time = 0;

        this.port.onmessage = (event) => {
            const msg = event.data;
            if (msg.type === "init") {
                this.style = msg.style;
                this.time = 0;
            } else if (msg.type === "stop") {
                this.style = null;
            }
        };
    }

    hasGenre(g) {
        if (!this.style) return false;
        return this.style.genres.includes(g);
    }

    process(inputs, outputs, parameters) {
        const output = outputs[0];
        const channel = output[0];

        if (!this.style) {
            for (let i = 0; i < channel.length; i++) channel[i] = 0;
            return true;
        }

        const style = this.style;
        const sr = this.sampleRate;
        const bpm = style.bpm;
        const secondsPerBeat = 60 / bpm;
        const beatsPerBar = 4;
        const barLength = secondsPerBeat * beatsPerBar;

        for (let i = 0; i < channel.length; i++) {
            const t = this.time;
            const beat = t / secondsPerBeat;
            const bar = t / barLength;
            const beatInBar = beat % beatsPerBar;

            const sectionInfo = getSectionAtTime(t, style);
            const sectionName = sectionInfo.name;
            const evolution = sectionInfo.evolution;

            let drums = 0;
            let bass = 0;
            let synth = 0;
            let vocalLayer = 0;

            // DRUMS
            let kick = 0, snare = 0, hat = 0;

            if (this.hasGenre("drum and bass")) {
                if (Math.abs(beatInBar - 0) < 0.04 || Math.abs(beatInBar - 1.5) < 0.04) {
                    kick = Math.sin(2 * Math.PI * 60 * t) * Math.exp(- (t % secondsPerBeat) * 22);
                }
                if (Math.abs(beatInBar - 1) < 0.04 || Math.abs(beatInBar - 2.5) < 0.04) {
                    snare = (Math.random() * 2 - 1) * 0.5 * Math.exp(- (t % secondsPerBeat) * 26);
                }
                if (Math.floor(beat * 4) % 2 === 0) {
                    hat = (Math.random() * 2 - 1) * 0.16;
                }
            }
            if (this.hasGenre("trap") || this.hasGenre("drill")) {
                if (Math.abs(beatInBar - 0) < 0.05 || Math.abs(beatInBar - 2) < 0.05) {
                    kick += Math.sin(2 * Math.PI * 50 * t) * Math.exp(- (t % secondsPerBeat) * 18);
                }
                if (Math.abs(beatInBar - 1) < 0.05 || Math.abs(beatInBar - 3) < 0.05) {
                    snare += (Math.random() * 2 - 1) * 0.4 * Math.exp(- (t % secondsPerBeat) * 22);
                }
                if (Math.floor(beat * 8) % 2 === 0) {
                    hat += (Math.random() * 2 - 1) * 0.12;
                }
            }
            if (this.hasGenre("edm") || this.hasGenre("house")) {
                if (Math.abs(beatInBar - 0) < 0.05 || Math.abs(beatInBar - 1) < 0.05 ||
                    Math.abs(beatInBar - 2) < 0.05 || Math.abs(beatInBar - 3) < 0.05) {
                    kick += Math.sin(2 * Math.PI * 60 * t) * Math.exp(- (t % secondsPerBeat) * 18);
                }
                if (Math.abs(beatInBar - 1.5) < 0.05 || Math.abs(beatInBar - 3.5) < 0.05) {
                    snare += (Math.random() * 2 - 1) * 0.35 * Math.exp(- (t % secondsPerBeat) * 20);
                }
                if (Math.floor(beat * 4) % 2 === 0) {
                    hat += (Math.random() * 2 - 1) * 0.1;
                }
            }
            if (this.hasGenre("ambient") || this.hasGenre("lofi")) {
                if (Math.abs(beatInBar - 0) < 0.05) {
                    kick += Math.sin(2 * Math.PI * 40 * t) * Math.exp(- (t % secondsPerBeat) * 8);
                }
                if (Math.abs(beatInBar - 2) < 0.05) {
                    snare += (Math.random() * 2 - 1) * 0.2 * Math.exp(- (t % secondsPerBeat) * 10);
                }
                if (Math.floor(beat * 2) % 2 === 0) {
                    hat += (Math.random() * 2 - 1) * 0.05;
                }
            }
            if (this.hasGenre("generic")) {
                if (Math.abs(beatInBar - 0) < 0.05 || Math.abs(beatInBar - 2) < 0.05) {
                    kick += Math.sin(2 * Math.PI * 60 * t) * Math.exp(- (t % secondsPerBeat) * 15);
                }
                if (Math.abs(beatInBar - 1) < 0.05 || Math.abs(beatInBar - 3) < 0.05) {
                    snare += (Math.random() * 2 - 1) * 0.3 * Math.exp(- (t % secondsPerBeat) * 18);
                }
                if (Math.floor(beat * 4) % 2 === 0) {
                    hat += (Math.random() * 2 - 1) * 0.1;
                }
            }

            let drumEnergy = 1.0;
            if (style.energy === "high") drumEnergy = 1.2;
            if (style.energy === "low") drumEnergy = 0.7;
            drums = (kick + snare + hat) * drumEnergy;

            // BASS
            let baseFreq = 55;
            if (this.hasGenre("drum and bass")) baseFreq = 80;
            if (this.hasGenre("trap") || this.hasGenre("drill")) baseFreq = 45;
            if (this.hasGenre("edm") || this.hasGenre("house")) baseFreq = 60;
            if (this.hasGenre("ambient") || this.hasGenre("lofi")) baseFreq = 40;
            if (style.mood === "dark") baseFreq *= 0.9;
            if (style.mood === "bright") baseFreq *= 1.05;

            let bassEnv = Math.max(0, Math.sin(Math.PI * (beatInBar / beatsPerBar)));
            let bassSectionMul = 1.0;
            if (sectionName.includes("intro")) bassSectionMul = 0.4;
            if (sectionName.includes("build")) bassSectionMul = 0.7;
            if (sectionName.includes("drop") || sectionName.includes("chorus")) bassSectionMul = 1.2;
            if (sectionName.includes("outro")) bassSectionMul = 0.5;

            // slight evolution: baseFreq drifts with evolution
            let evolvedBase = baseFreq * (1 + 0.1 * evolution);
            bass = Math.sin(2 * Math.PI * evolvedBase * t) * bassEnv * 0.4 * bassSectionMul;

            // SYNTH
            let synthFreq = 220;
            if (style.mood === "bright" || style.mood === "cinematic") synthFreq = 440;
            if (style.mood === "dark") synthFreq = 180;
            if (this.hasGenre("synthwave")) synthFreq = 330;
            if (this.hasGenre("ambient") || style.mood === "dreamy") synthFreq *= 0.7;

            let synthAmp = 0.0;
            if (sectionName.includes("intro")) synthAmp = 0.2;
            else if (sectionName.includes("build")) synthAmp = 0.35;
            else if (sectionName.includes("drop") || sectionName.includes("chorus") || sectionName.includes("hook")) synthAmp = 0.6;
            else if (sectionName.includes("verse")) synthAmp = 0.4;
            else if (sectionName.includes("bridge")) synthAmp = 0.45;
            else if (sectionName.includes("outro")) synthAmp = 0.25;
            else synthAmp = 0.35;

            let melodicMod = 1 + 0.15 * Math.sin(2 * Math.PI * (t / (barLength * 4)) + evolution * Math.PI);
            let f1 = synthFreq * melodicMod;
            let f2 = f1 * 2;
            synth = (Math.sin(2 * Math.PI * f1 * t) +
                     0.5 * Math.sin(2 * Math.PI * f2 * t)) * synthAmp;

            // VOCAL-LIKE
            if (style.vocals && (sectionName.includes("verse") || sectionName.includes("chorus") || sectionName.includes("hook"))) {
                let phrasePos = (t % (barLength * 4)) / (barLength * 4);
                let vowelFreq = 300 + 200 * Math.sin(phrasePos * Math.PI * 2 + evolution * 2 * Math.PI);
                let formant1 = Math.sin(2 * Math.PI * vowelFreq * t);
                let formant2 = Math.sin(2 * Math.PI * (vowelFreq * 2.5) * t);
                let env = Math.max(0, Math.sin(Math.PI * phrasePos));
                let vocalGain = (style.mood === "cinematic") ? 0.5 : 0.35;
                vocalLayer = (formant1 * 0.4 + formant2 * 0.2) * env * vocalGain;
            }

            let sample = drums + bass + synth + vocalLayer;
            sample *= 0.6;

            let globalPos = (t % (style.lengthSeconds || 180)) / (style.lengthSeconds || 180);
            let arc = Math.sin(globalPos * Math.PI);
            sample *= 0.7 + 0.6 * arc;

            channel[i] = sample;
            this.time += 1 / sr;
        }

        return true;
    }
}

registerProcessor("maximus-processor", MaximusProcessor);
