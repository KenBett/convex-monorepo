/**
 * Client-side performance telemetry for the voice RAG pipeline.
 *
 * Mirrors the server-side VoiceTelemetry labels so both logs are comparable.
 * All timers are anchored from the moment `VoiceClientTelemetry` is created,
 * which should be immediately after the user taps "stop recording".
 */
export class VoiceClientTelemetry {
  private readonly start: number;
  private sttEnd: number | null = null;
  private dbEnd: number | null = null;
  private llmFirstTokenEnd: number | null = null;
  private ttsFirstByteEnd: number | null = null;

  constructor() {
    this.start = performance.now();
  }

  markStt(): void {
    this.sttEnd = performance.now();
    console.log(`[STT Delta] ${Math.round(this.sttEnd - this.start)}ms`);
  }

  markDb(cacheHit: boolean): void {
    this.dbEnd = performance.now();
    const label = cacheHit ? " (cache hit)" : "";
    console.log(
      `[DB Retrieval Delta] ${Math.round(this.dbEnd - (this.sttEnd ?? this.start))}ms${label}`,
    );
  }

  markLlmFirstToken(): void {
    if (this.llmFirstTokenEnd !== null) return;
    this.llmFirstTokenEnd = performance.now();
    console.log(
      `[LLM First-Token Delta] ${Math.round(this.llmFirstTokenEnd - (this.dbEnd ?? this.sttEnd ?? this.start))}ms`,
    );
  }

  markTtsFirstByte(): void {
    if (this.ttsFirstByteEnd !== null) return;
    this.ttsFirstByteEnd = performance.now();
    console.log(
      `[TTS First-Byte Delta] ${Math.round(this.ttsFirstByteEnd - (this.llmFirstTokenEnd ?? this.dbEnd ?? this.start))}ms`,
    );
  }

  markDone(): void {
    console.log(`[Total Roundtrip] ${Math.round(performance.now() - this.start)}ms`);
  }
}
