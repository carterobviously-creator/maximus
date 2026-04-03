// Simple evolving song scheduler for Maximus

function getSectionAtTime(timeSeconds, style) {
    const bpm = style.bpm;
    const secondsPerBeat = 60 / bpm;
    const beatsPerBar = 4;
    const barsPerSection = 8; // each section = 8 bars
    const sectionLength = secondsPerBeat * beatsPerBar * barsPerSection;

    const index = Math.floor(timeSeconds / sectionLength);
    const loopedIndex = index % style.structure.length;
    const name = style.structure[loopedIndex];

    // evolution factor: slowly increases with time
    const evolution = Math.min(1, timeSeconds / (style.lengthSeconds || 180));

    return {
        name,
        evolution,
        index: loopedIndex
    };
}
