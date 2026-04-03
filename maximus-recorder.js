function createMaximusRecorder(audioCtx, sourceNode, onComplete) {
    const dest = audioCtx.createMediaStreamDestination();
    sourceNode.connect(dest);

    const mediaRecorder = new MediaRecorder(dest.stream);
    const chunks = [];

    mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/wav" });
        onComplete(blob);
    };

    return {
        start() {
            chunks.length = 0;
            mediaRecorder.start();
        },
        stop() {
            if (mediaRecorder.state !== "inactive") {
                mediaRecorder.stop();
            }
        }
    };
}
