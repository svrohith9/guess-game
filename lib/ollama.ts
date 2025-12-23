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
  images?: string[]
): Promise<string> {
  if (provider === "openai") {
    throw new Error("OpenAI provider not configured. Switch provider in /lib/ollama.ts.");
  }
  const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt, images, stream: false })
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
    "You are a quiz-generator. Given the detected objects and texts, create 10 varied questions: count, color, locate, text, memory. Return JSON only: {questions:[{q:\"...\",type:\"count|color|locate|text|memory\",options:[...],answerIndex:0,timer:10},...]}\n\n" +
    JSON.stringify(payload);
  try {
    const response = await runOllama("llava:7b", prompt);
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
    "Extract key facts, definitions, numbers. Return JSON: {flashcards:[{front:\"...\",back:\"...\",type:\"definition|fill|mcq|truefalse\"},...]}\n\n" +
    text;
  try {
    const response = await runOllama("llama3:latest", prompt);
    return safeJsonParse(response, { flashcards: [] });
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
    return JSON.parse(cleaned) as T;
  } catch (error) {
    console.error("JSON parse error", error, "Hint: ensure Ollama returns valid JSON.");
    return fallback;
  }
}
