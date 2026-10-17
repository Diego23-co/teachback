import { useCallback, useEffect, useRef, useState } from "react";

/* Minimal typings for the Web Speech API (not in TypeScript's DOM lib). */
interface RecognitionResult { isFinal: boolean; 0: { transcript: string } }
interface RecognitionEvent { resultIndex: number; results: ArrayLike<RecognitionResult> }
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

const Impl = (typeof window !== "undefined" &&
  ((window as unknown as { SpeechRecognition?: new () => Recognition }).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: new () => Recognition }).webkitSpeechRecognition)) || null;

export const speechSupported = !!Impl;

/** Voice input: transcribes speech live; the transcript is handed back for review before sending. */
export function useSpeech(onDone: (transcript: string) => void, onError: (message: string) => void) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const rec = useRef<Recognition | null>(null);
  const finalText = useRef("");
  const done = useRef(onDone);
  const fail = useRef(onError);
  done.current = onDone;
  fail.current = onError;

  const start = useCallback(() => {
    if (!Impl) { fail.current("Voice input isn’t supported in this browser. Try Chrome or Edge, or type instead."); return; }
    const r = new Impl();
    r.lang = navigator.language || "en-ZA";
    r.continuous = true;
    r.interimResults = true;
    finalText.current = "";
    r.onresult = (e) => {
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText.current += `${res[0].transcript.trim()} `;
        else live += res[0].transcript;
      }
      setInterim(`${finalText.current}${live}`.trim());
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") fail.current("Microphone access was blocked. Allow it in your browser, or type instead.");
      else if (e.error !== "aborted" && e.error !== "no-speech") fail.current("Voice input stopped unexpectedly. You can try again or type.");
    };
    r.onend = () => {
      setListening(false);
      const text = finalText.current.trim();
      setInterim("");
      if (text) done.current(text);
      rec.current = null;
    };
    rec.current = r;
    try { r.start(); setListening(true); } catch { fail.current("Couldn’t start the microphone."); }
  }, []);

  const stop = useCallback(() => rec.current?.stop(), []);
  const cancel = useCallback(() => {
    finalText.current = "";
    rec.current?.abort();
  }, []);

  useEffect(() => () => rec.current?.abort(), []);
  return { listening, interim, start, stop, cancel, supported: speechSupported };
}
