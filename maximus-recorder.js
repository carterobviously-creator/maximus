// Maximus V3 – Live Recorder (fixed infinite mode)

function createMaximusRecorder(audioCtx, sourceNode, onComplete) {
    // Create a MediaStreamDestination FIRST
    const dest = audioCtx.createMediaStreamDestination();

    // Connect the Worklet to the recorder BEFORE anything else
    sourceNode.connect(dest);

    // Create the MediaRecorder from the destination stream
    const mediaRecorder = new MediaRecorder(dest.stream, {
        mimeType: "audio/webm" // safest for long recordings
    });

    const chunks = [];

    mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
            chunks.push(e.data);
        }
    };

    mediaRecorder.onstop = () => {
        // Merge chunks into a single Blob
        const blob = new Blob(chunks, { type: "audio/webm" });
        onComplete(blob);
    };

    return {
        start() {
            chunks.length = 0;
            mediaRecorder.start(100); 
            // ^ 100ms timeslice prevents auto-stop
        },
        stop() {
            if (mediaRecorder.state !== "inactive") {
                mediaRecorder.stop();
            }
        }
    };
}
