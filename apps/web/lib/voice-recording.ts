export type VoiceRecordingPayload = {
  audioBase64: string;
  filename: string;
  mimeType: string;
};

export function getSupportedRecordingMimeType(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];

  for (const mimeType of candidates) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }

  return "";
}

export async function blobToRecordingPayload(
  blob: Blob,
): Promise<VoiceRecordingPayload> {
  const mimeType = blob.type || "audio/webm";
  const audioBase64 = await blobToBase64(blob);

  if (mimeType.includes("mp4")) {
    return {
      audioBase64,
      filename: "recording.m4a",
      mimeType: "audio/mp4",
    };
  }
  if (mimeType.includes("ogg")) {
    return {
      audioBase64,
      filename: "recording.ogg",
      mimeType: "audio/ogg",
    };
  }

  return {
    audioBase64,
    filename: "recording.webm",
    mimeType: mimeType.includes("webm") ? mimeType : "audio/webm",
  };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Failed to read recording"));
        return;
      }
      const base64 = result.split(",")[1];
      if (!base64) {
        reject(new Error("Failed to encode recording"));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Failed to read recording"));
    reader.readAsDataURL(blob);
  });
}
