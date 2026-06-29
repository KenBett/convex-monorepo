"use node";

/**
 * Streaming voice RAG endpoint.
 *
 * POST /voice/turn
 *
 * Pipelines Whisper STT → cached vector search (top_k=2) → streaming LLM
 * tokens → per-sentence TTS, writing Server-Sent Events (SSE) as each stage
 * completes. This lets the client begin playing audio before the LLM has
 * finished generating the full answer.
 *
 * SSE event types emitted:
 *   stt        { text: string }
 *   sources    { sources: SearchResult[] }
 *   llm_delta  { text: string }
 *   tts_chunk  { audioBase64: string; index: number }
 *   done       { answer: string; sources: SearchResult[] }
 *   error      { message: string }
 */

import { openai as openaiProvider } from "@ai-sdk/openai";
import { streamText } from "ai";

import { httpAction } from "./_generated/server";
import {
  GLOBAL_NAMESPACE,
  VECTOR_SCORE_THRESHOLD,
  VOICE_SEARCH_LIMIT,
  rag,
} from "./lib/rag";
import {
  VoiceTelemetry,
  base64ToUint8Array,
  buildVoiceSystemPromptWithContext,
  createSentenceBuffer,
  formatContextForPrompt,
  synthesizeSentenceMp3,
  transcribeWhisper,
} from "./lib/voicePipeline";
import { cacheGet, cacheSet } from "./lib/voiceQueryCache";

const DEFAULT_VOICE = "nova";

type ChatTurn = { content: string; role: "assistant" | "user" };

function getOpenAiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not configured");
  return key;
}

function sseEvent(type: string, data: unknown): string {
  return `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
}

export const streamVoiceTurn = httpAction(async (ctx, request) => {
  const tel = new VoiceTelemetry();

  // ── Auth ──────────────────────────────────────────────────────────────────
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── Parse request ─────────────────────────────────────────────────────────
  let audioBase64: string;
  let mimeType: string;
  let filename: string;
  let history: ChatTurn[] | undefined;
  let voice: string = DEFAULT_VOICE;

  try {
    const body: {
      audioBase64: string;
      mimeType?: string;
      filename?: string;
      history?: ChatTurn[];
      voice?: string;
    } = await request.json();
    audioBase64 = body.audioBase64;
    mimeType = body.mimeType ?? "audio/mp4";
    filename = body.filename ?? "recording.m4a";
    history = body.history;
    voice = body.voice ?? DEFAULT_VOICE;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── SSE stream ────────────────────────────────────────────────────────────
  const { readable, writable } = new TransformStream<string, string>();
  const writer = writable.getWriter();
  const enc = new TextEncoder();

  const write = async (event: string, data: unknown) => {
    await writer.write(enc.encode(sseEvent(event, data)));
  };

  // Run the pipeline asynchronously so the Response can be returned
  // immediately (Convex will keep the response open until writer.close()).
  void (async () => {
    try {
      const openAiKey = getOpenAiKey();

      // ── STT ───────────────────────────────────────────────────────────────
      const audioBytes = base64ToUint8Array(audioBase64);
      if (audioBytes.byteLength === 0) throw new Error("Recording was empty");

      const transcript = await transcribeWhisper(
        audioBytes,
        mimeType,
        filename,
        openAiKey,
      );
      tel.markStt();
      await write("stt", { text: transcript });

      // ── Vector search with cache ──────────────────────────────────────────
      const cached = cacheGet(transcript);
      let context: string;
      let sources: Array<{
        entryId: string;
        score: number;
        text: string;
        title?: string;
      }>;

      if (cached) {
        context = cached.context;
        sources = cached.sources;
        tel.markDb(true);
      } else {
        const searchResult = await rag.search(ctx, {
          chunkContext: { before: 0, after: 0 },
          limit: VOICE_SEARCH_LIMIT,
          namespace: GLOBAL_NAMESPACE,
          query: transcript,
          vectorScoreThreshold: VECTOR_SCORE_THRESHOLD,
        });
        sources = searchResult.results.map((r) => {
          const entry = searchResult.entries.find(
            (e) => e.entryId === r.entryId,
          );
          return {
            entryId: r.entryId,
            score: r.score,
            text: r.content.map((c) => c.text).join("\n"),
            title: entry?.title,
          };
        });
        context = formatContextForPrompt(sources);
        cacheSet(transcript, { context, sources });
        tel.markDb(false);
      }

      await write("sources", { sources });

      // ── Streaming LLM → sentence-chunked TTS ─────────────────────────────
      const systemPrompt = buildVoiceSystemPromptWithContext(context, history);

      // Queue of in-flight TTS promises; we fire them off without blocking the
      // LLM token loop so STT latency is fully hidden behind LLM generation.
      type TtsJob = { index: number; promise: Promise<string> };
      const ttsQueue: TtsJob[] = [];
      let sentenceIndex = 0;
      let firstTokenLogged = false;
      let fullAnswer = "";

      const { push: pushBuffer, flush: flushBuffer } = createSentenceBuffer(
        (sentence) => {
          const index = sentenceIndex++;
          ttsQueue.push({
            index,
            promise: synthesizeSentenceMp3(sentence, voice, openAiKey),
          });
        },
      );

      // Drain completed TTS jobs in order and write them to SSE.
      // Returns the index of the next un-sent job.
      let nextSendIndex = 0;
      let firstByteLogged = false;

      const drainTtsQueue = async () => {
        while (ttsQueue.length > 0) {
          const job = ttsQueue[0];
          if (!job || job.index !== nextSendIndex) break;

          // Check if this job finished without blocking.
          let audioBase64Result: string | null = null;
          try {
            audioBase64Result = await job.promise;
          } catch {
            // If TTS fails for one chunk, skip it rather than aborting.
            ttsQueue.shift();
            nextSendIndex++;
            continue;
          }

          ttsQueue.shift();
          nextSendIndex++;

          if (!firstByteLogged) {
            tel.markTtsFirstByte();
            firstByteLogged = true;
          }
          await write("tts_chunk", {
            audioBase64: audioBase64Result,
            index: job.index,
          });
        }
      };

      const llmStream = await streamText({
        messages: [{ content: transcript, role: "user" }],
        model: openaiProvider.chat("gpt-4o-mini"),
        system: systemPrompt,
      });

      for await (const delta of llmStream.textStream) {
        if (!firstTokenLogged) {
          tel.markLlmFirstToken();
          firstTokenLogged = true;
        }
        fullAnswer += delta;
        await write("llm_delta", { text: delta });
        pushBuffer(delta);
        await drainTtsQueue();
      }

      flushBuffer();

      // Wait for all remaining TTS jobs to complete in order.
      for (const job of ttsQueue) {
        let audioBase64Result: string;
        try {
          audioBase64Result = await job.promise;
        } catch {
          continue;
        }

        if (!firstByteLogged) {
          tel.markTtsFirstByte();
          firstByteLogged = true;
        }
        await write("tts_chunk", { audioBase64: audioBase64Result, index: job.index });
      }

      await write("done", { answer: fullAnswer, sources });
      tel.markDone();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Voice turn failed";
      await write("error", { message });
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable as unknown as ReadableStream<Uint8Array>, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache",
      "Content-Type": "text/event-stream",
      "X-Accel-Buffering": "no",
    },
    status: 200,
  });
});
