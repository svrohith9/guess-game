import Link from "next/link";
import TopBar from "@/components/TopBar";
import InstallPrompt from "./components/InstallPrompt";

export default function HomePage() {
  return (
    <main className="min-h-screen px-6 py-8 text-base-content">
      <TopBar />
      <InstallPrompt />
      <section className="mt-6 grid gap-6">
        <div className="card-surface p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-400">Ready to Play?</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">FlashGame</h1>
          <p className="mt-2 text-sm text-white/70">
            Turn the world around you into a flashcard game. Snap a photo or scan a doc to start.
          </p>
          <div className="mt-6 grid gap-4">
            <Link
              href="/module1"
              className="flex items-center justify-between rounded-2xl bg-emerald-400/90 px-5 py-4 text-lg font-semibold text-black shadow-lg shadow-emerald-500/30"
              aria-label="Start Picture Challenge"
            >
              Picture Challenge
              <span className="text-xl">></span>
            </Link>
            <Link
              href="/module2"
              className="flex items-center justify-between rounded-2xl bg-base-200/70 px-5 py-4 text-lg font-semibold text-white"
              aria-label="Start Doc Challenge"
            >
              Doc Challenge
              <span className="text-xl">></span>
            </Link>
          </div>
        </div>
        <div className="card-surface p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-400">Weekly Leaderboard</p>
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-base-200/60 px-4 py-3">
            <span className="text-sm text-white/70">You are #4 this week</span>
            <Link href="/(game)/module2" className="text-emerald-300" aria-label="View leaderboard">
              View All
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
