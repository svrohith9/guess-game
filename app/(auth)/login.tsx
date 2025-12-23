import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="min-h-screen px-6 py-8">
      <div className="card-surface mx-auto mt-12 max-w-md p-6">
        <h1 className="text-2xl font-semibold text-white">Log in</h1>
        <p className="mt-2 text-sm text-white/70">Use your Supabase account to sync progress.</p>
        <form className="mt-6 grid gap-4">
          <input
            className="input input-bordered w-full bg-base-200"
            placeholder="Email"
            type="email"
            aria-label="Email"
          />
          <input
            className="input input-bordered w-full bg-base-200"
            placeholder="Password"
            type="password"
            aria-label="Password"
          />
          <button className="btn rounded-full bg-emerald-400 text-black" aria-label="Login">
            Log in
          </button>
        </form>
        <p className="mt-4 text-sm text-white/60">
          New here? <Link className="text-emerald-300" href="/register">Create account</Link>
        </p>
      </div>
    </main>
  );
}
