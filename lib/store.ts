import { create } from "zustand";

export type GameQuestion = {
  q: string;
  type: "count" | "color" | "locate" | "text" | "memory";
  options: string[];
  answerIndex: number;
  timer: number;
  bbox?: [number, number, number, number];
  textMatch?: string;
};

export type FlashCard = {
  front: string;
  back: string;
  type: "definition" | "fill" | "mcq" | "truefalse";
  sm2?: {
    interval: number;
    repetition: number;
    easeFactor: number;
    due: number;
  };
};

type AuthSlice = {
  userId?: string;
  xp: number;
  streak: number;
  setUser: (userId?: string) => void;
  addXp: (amount: number) => void;
  setStreak: (streak: number) => void;
};

type GameSlice = {
  lives: number;
  score: number;
  questionIndex: number;
  setLives: (lives: number) => void;
  addScore: (amount: number) => void;
  setQuestionIndex: (index: number) => void;
  resetGame: () => void;
};

type ImageSlice = {
  imageUrl?: string;
  questions: GameQuestion[];
  setImageUrl: (url?: string) => void;
  setQuestions: (questions: GameQuestion[]) => void;
};

type DocSlice = {
  flashcards: FlashCard[];
  currentIndex: number;
  settings: {
    types: FlashCard["type"][];
    count: number;
    timed: boolean;
  };
  setFlashcards: (cards: FlashCard[]) => void;
  setCurrentIndex: (index: number) => void;
  updateSettings: (partial: Partial<DocSlice["settings"]>) => void;
};

type StoreState = AuthSlice & GameSlice & ImageSlice & DocSlice;

export const useStore = create<StoreState>((set) => ({
  userId: undefined,
  xp: 0,
  streak: 5,
  setUser: (userId) => set({ userId }),
  addXp: (amount) => set((state) => ({ xp: state.xp + amount })),
  setStreak: (streak) => set({ streak }),
  lives: 3,
  score: 0,
  questionIndex: 0,
  setLives: (lives) => set({ lives }),
  addScore: (amount) => set((state) => ({ score: state.score + amount })),
  setQuestionIndex: (questionIndex) => set({ questionIndex }),
  resetGame: () => set({ lives: 3, score: 0, questionIndex: 0 }),
  imageUrl: undefined,
  questions: [],
  setImageUrl: (imageUrl) => set({ imageUrl }),
  setQuestions: (questions) => set({ questions }),
  flashcards: [],
  currentIndex: 0,
  settings: {
    types: ["definition", "fill", "mcq", "truefalse"],
    count: 10,
    timed: true
  },
  setFlashcards: (flashcards) => set({ flashcards }),
  setCurrentIndex: (currentIndex) => set({ currentIndex }),
  updateSettings: (partial) =>
    set((state) => ({
      settings: { ...state.settings, ...partial }
    }))
}));
