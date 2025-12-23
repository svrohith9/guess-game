export type OllamaMessage = {
  role: "system" | "user" | "assistant";
  content: string;
  images?: string[];
};

const provider: "ollama" | "openai" = "ollama";

const OLLAMA_BASE_URL =
  process.env.NEXT_PUBLIC_OLLAMA_URL?.replace(/\/$/, "") ?? "http://localhost:11434";

export async function runOllama(
  model: string,
  prompt: string,
  images?: string[],
  format?: "json"
): Promise<string> {
  if (provider === "openai") {
    throw new Error("OpenAI provider not configured. Switch provider in /lib/ollama.ts.");
  }
  const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      images,
      stream: false,
      format,
      options: { temperature: 0 }
    })
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("Ollama error", text, "Hint: ensure Ollama is running on localhost:11434");
    throw new Error(text);
  }
  const data = (await res.json()) as { response?: string };
  return data.response ?? "";
}

export async function generateQuizFromImage(payload: unknown) {
  const prompt =
    "Return ONLY valid JSON with no commentary. Write simple, human-friendly questions. Always provide exactly 4 answer options. Schema: {questions:[{q:\"...\",type:\"count|color|locate|text|memory\",options:[\"A\",\"B\",\"C\",\"D\"],answerIndex:0,timer:10},...]}\n\n" +
    "Input:\n" +
    JSON.stringify(payload);
  try {
    const response = await runOllama("llava:7b", prompt, undefined, "json");
    return safeJsonParse(response, { questions: [] });
  } catch (error) {
    console.error("Ollama fallback", error, "Hint: run `ollama pull llava:7b` and start Ollama.");
    return {
      questions: [
        {
          q: "What color dominates the image?",
          type: "color",
          options: ["green", "blue", "red", "yellow"],
          answerIndex: 0,
          timer: 10
        }
      ]
    };
  }
}

export async function generateFlashcardsFromText(text: string) {
  const prompt =
    "Return ONLY valid JSON with no commentary. Schema: {flashcards:[{front:\"...\",back:\"...\",type:\"definition|fill|mcq|truefalse\"},...]}\n\n" +
    "Input:\n" +
    text;
  try {
    const response = await runOllama("llama3:latest", prompt, undefined, "json");
    return safeJsonParse(response, fallbackFlashcards(text));
  } catch (error) {
    console.error("Ollama fallback", error, "Hint: run `ollama pull llama3:latest` and start Ollama.");
    return {
      flashcards: [
        { front: "Sample term", back: "Sample definition", type: "definition" },
        { front: "2 + 2 =", back: "4", type: "fill" }
      ]
    };
  }
}

function safeJsonParse<T>(raw: string, fallback: T): T {
  try {
    const cleaned = raw.trim().replace(/^```json/, "").replace(/```$/, "");
    const maybeJson = extractJson(cleaned);
    return JSON.parse(maybeJson) as T;
  } catch (error) {
    console.error("JSON parse error", error, "Hint: ensure Ollama returns valid JSON.");
    return fallback;
  }
}

function extractJson(raw: string) {
  const firstObject = raw.indexOf("{");
  const firstArray = raw.indexOf("[");
  const startCandidates = [firstObject, firstArray].filter((v) => v >= 0);
  if (!startCandidates.length) return raw;
  const start = Math.min(...startCandidates);
  const stack: string[] = [];
  let inString = false;
  let escape = false;
  for (let i = start; i < raw.length; i += 1) {
    const char = raw[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === "\\") {
      escape = true;
      continue;
    }
    if (char === "\"") {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === "{" || char === "[") {
      stack.push(char);
    } else if (char === "}" || char === "]") {
      stack.pop();
      if (stack.length === 0) {
        return raw.slice(start, i + 1);
      }
    }
  }
  return raw;
}

function fallbackFlashcards(text: string) {
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 12)
    .slice(0, 5);
  if (!lines.length) {
    return {
      flashcards: [
        { front: "Sample term", back: "Sample definition", type: "definition" }
      ]
    };
  }
  return {
    flashcards: lines.map((line) => ({
      front: line,
      back: "Review this detail.",
      type: "definition"
    }))
  };
}
