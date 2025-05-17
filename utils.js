let audioContext;

function getAudioContext() {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.error("Web Audio API is not supported in this browser", e);
            return null;
        }
    }
    return audioContext;
}

export async function playSound(soundUrl) {
    const context = getAudioContext();
    if (!context) return;

    // Ensure sound paths are root-relative if not already
    const normalizedSoundUrl = soundUrl.startsWith('/') ? soundUrl : `/${soundUrl}`;

    try {
        const response = await fetch(normalizedSoundUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} for ${normalizedSoundUrl}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await context.decodeAudioData(arrayBuffer);

        const source = context.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(context.destination);
        source.start(0);
    } catch (error) {
        console.error(`Error playing sound ${normalizedSoundUrl}:`, error);
    }
}

