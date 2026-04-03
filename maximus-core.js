let audioCtx = null;
let analyser = null;
let maximusNode = null;
let recorder = null;
let bufferData = null;

const canvas = document.getElementById("waveform");
const ctx = canvas.getContext("2d");

function ensureAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;
    }
}

function drawWaveform() {
    requestAnimationFrame(drawWaveform);
    if (!analyser) return;

    let data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);

    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = 2;
    ctx.strokeStyle = "#00eaff";
    ctx.beginPath();

    let slice = canvas.width / data.length;
    let x = 0;

    for (let i = 0; i < data.length; i++) {
        let v = data[i] / 128.0;
        let y = (v * canvas.height) / 2;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);

        x += slice;
    }

    ctx.stroke();
}
drawWaveform();

/* SMART PARSER */
function parseStyle(promptText, lengthOverride) {
    const text = (promptText || "").toLowerCase();

    const style = {
        genres: [],
        mood: "neutral",
        energy: "medium",
        instruments: [],
        vocals: false,
        structure: [],
        bpm: 120,
        lengthSeconds: 60
    };

    const genreMap = {
        "trap": "trap",
        "dnb": "drum and bass",
        "drum and bass": "drum and bass",
        "edm": "edm",
        "house": "house",
        "ambient": "ambient",
        "chill": "ambient",
        "hip hop": "hip hop",
        "boom bap": "boom bap",
        "synthwave": "synthwave",
        "lofi": "lofi",
        "dubstep": "dubstep",
        "drill": "drill"
    };
    for (const key in genreMap) {
        if (text.includes(key)) style.genres.push(genreMap[key]);
    }
    if (style.genres.length === 0) style.genres.push("generic");

    if (text.includes("dark")) style.mood = "dark";
    if (text.includes("bright")) style.mood = "bright";
    if (text.includes("sad")) style.mood = "sad";
    if (text.includes("happy")) style.mood = "happy";
    if (text.includes("cinematic")) style.mood = "cinematic";
    if (text.includes("dreamy")) style.mood = "dreamy";

    if (text.includes("high energy") || text.includes("hype") || text.includes("fast")) style.energy = "high";
    if (text.includes("low energy") || text.includes("chill") || text.includes("slow")) style.energy = "low";

    const instrumentKeywords = [
        "deep bass", "bass", "808", "reese", "sub",
        "pads", "pad", "lead", "melody", "synth", "bells", "piano", "keys", "atmospheric"
    ];
    instrumentKeywords.forEach(inst => {
        if (text.includes(inst)) style.instruments.push(inst);
    });

    if (text.includes("vocal") || text.includes("rap") || text.includes("singer") || text.includes("space for vocals"))
        style.vocals = true;

    const structureKeywords = ["intro", "build", "drop", "verse", "chorus", "hook", "bridge", "outro"];
    structureKeywords.forEach(part => {
        if (text.includes(part)) style.structure.push(part);
    });
    if (style.structure.length === 0) {
        style.structure = ["intro", "build", "drop", "verse", "chorus", "bridge", "outro"];
    }

    function pickBpm(genres) {
        if (genres.includes("drum and bass")) return 170;
        if (genres.includes("dubstep")) return 140;
        if (genres.includes("trap") || genres.includes("drill")) return 140;
        if (genres.includes("edm") || genres.includes("house")) return 128;
        if (genres.includes("hip hop") || genres.includes("boom bap")) return 90;
        if (genres.includes("lofi")) return 80;
        if (genres.includes("ambient")) return 75;
        return 120;
    }
    style.bpm = pickBpm(style.genres);

    if (style.energy === "high") style.bpm += 5;
    if (style.energy === "low") style.bpm -= 5;

    if (!isNaN(lengthOverride) && lengthOverride > 5 && lengthOverride <= 600)
        style.lengthSeconds = lengthOverride;

    const lengthMatch = text.match(/(\d+)\s*(seconds|second|sec|minutes|minute|min)/);
    if (lengthMatch) {
        let num = parseInt(lengthMatch[1]);
        if (lengthMatch[2].includes("min")) num *= 60;
        style.lengthSeconds = Math.max(10, Math.min(num, 600));
    }

    if (text.includes("short")) style.lengthSeconds = 30;
    if (text.includes("long")) style.lengthSeconds = 120;
    if (text.includes("full song") || text.includes("full track")) style.lengthSeconds = 180;

    return style;
}

/* ENGINE BOOTSTRAP */
async function startMaximus(promptText, lengthOverride) {
    ensureAudioContext();

    const style = parseStyle(promptText, lengthOverride);

    if (!audioCtx.audioWorklet) {
        alert("AudioWorklet not supported in this browser.");
        return;
    }

    // load worklet once
    if (!startMaximus.workletLoaded) {
        await audioCtx.audioWorklet.addModule("maximus-worklet.js");
        startMaximus.workletLoaded = true;
    }

    if (maximusNode) {
        maximusNode.port.postMessage({ type: "stop" });
        maximusNode.disconnect();
        maximusNode = null;
    }

    maximusNode = new AudioWorkletNode(audioCtx, "maximus-processor", {
        numberOfInputs: 0,
        numberOfOutputs: 1,
        outputChannelCount: [1]
    });

    maximusNode.port.postMessage({
        type: "init",
        style: style
    });

    maximusNode.connect(analyser);
    analyser.connect(audioCtx.destination);

    // recorder
    recorder = createMaximusRecorder(audioCtx, maximusNode, (blob) => {
        bufferData = blob;
        document.getElementById("player").src = URL.createObjectURL(blob);
    });

    recorder.start();
}

/* HOOK UI */
document.getElementById("generateBtn").onclick = () => {
    let promptText = document.getElementById("prompt").value || "";
    let lengthVal = parseFloat(document.getElementById("length").value);
    startMaximus(promptText, lengthVal);
};

document.getElementById("downloadBtn").onclick = () => {
    if (!recorder) return;
    recorder.stop();
};
