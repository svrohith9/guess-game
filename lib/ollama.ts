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
    "You are a trivia-generator that looks at the real image pixels.\n" +
    "I will give you a low-level object list only to save time; you MUST verify every claim against the actual image before writing the question.\n" +
    "Rules\n" +
    "Return ONLY valid JSON, no commentary, no markdown code fence.\n" +
    "Write exactly 5 questions.\n" +
    "Use every type at least once: count, color, locate, text, memory.\n" +
    "Each question must have 4 options (A-D) and answerIndex (0-3).\n" +
    "Make questions simple, human-friendly, and unambiguous.\n" +
    "Timer is always 10 s.\n" +
    "Do NOT ask about anything you cannot see in the pixels.\n" +
    "If an object is partially occluded, ask “visible” count only.\n" +
    "For memory type: show the image for 3 s, then hide it and ask the question (the app will handle the hide/show; you just write the question).\n" +
    "Prefer concrete, primary colours (red, blue, green, yellow, black, white, orange, purple, pink, brown, grey).\n" +
    "For locate questions, give 4 object names; the correct one must touch or be inside the target region.\n" +
    "If no text is detected, skip “text” type and add an extra “memory” question instead.\n" +
    "Output schema\n" +
    "{\"questions\":[{\"q\":\"...\",\"type\":\"count|color|locate|text|memory\",\"options\":[\"A\",\"B\",\"C\",\"D\"],\"answerIndex\":0,\"timer\":10}, ... ]}\n" +
    "Step-by-step\n" +
    "Silently scan the entire image and confirm each bbox label.\n" +
    "Count exact visible instances.\n" +
    "Pick one clear colour per coloured object (ignore tiny highlights).\n" +
    "Choose one prominent item to hide later for memory type.\n" +
    "Build 5 questions accordingly; double-check answers against pixels.\n\n" +
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

export async function generateFlashcardsFromText(
  text: string,
  types: Array<"mcq" | "truefalse">
) {
  const typeHint =
    types.length === 1 ? `Use only ${types[0]}.` : `Types: ${types.join(", ")}.`;
  const prompt =
    "You are a flash-card generator that reads the supplied text verbatim.\n" +
    "You MUST use only the facts that actually appear.\n" +
    "Never invent numbers, dates, or names.\n" +
    "Rules\n" +
    "Return ONLY valid JSON, no commentary, no code fence.\n" +
    "Create 12 cards.\n" +
    typeHint +
    "MCQ: exactly 4 options (A-D) and answerIndex (0-3). Options must be plausible, same style/length, and not obviously correct.\n" +
    "True/False: options [\"True\",\"False\"] and answerIndex 0 or 1.\n" +
    "Make questions non-trivial: ask about deductibles, limits, VIN prefix, policy length, mailing address, company name, etc.\n" +
    "Copy dates, dollar amounts, and proper nouns exactly as written.\n" +
    "If a numeric value contains a comma, keep it.\n" +
    "Avoid duplicate questions.\n" +
    "Avoid using the correct answer as the only numeric or proper noun in the options.\n" +
    "Keep wording simple and unambiguous.\n" +
    "Schema: {flashcards:[{front:\"...\",back:\"...\",type:\"mcq|truefalse\",options:[\"A\",\"B\",\"C\",\"D\"],answerIndex:0},...]}\n\n" +
    "Input:\n" +
    text;
  try {
    const response = await runOllama("llama3:latest", prompt, undefined, "json");
    return safeJsonParse(response, fallbackFlashcards(text));
  } catch (error) {
    console.error("Ollama fallback", error, "Hint: run `ollama pull llama3:latest` and start Ollama.");
    return fallbackFlashcards(text);
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
        {
          front: "The sky is blue.",
          back: "True",
          type: "truefalse",
          options: ["True", "False"],
          answerIndex: 0
        }
      ]
    };
  }
  return {
    flashcards: lines.map((line) => ({
      front: line,
      back: "True",
      type: "truefalse",
      options: ["True", "False"],
      answerIndex: 0
    }))
  };
}
