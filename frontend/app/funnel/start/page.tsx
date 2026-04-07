import { FunnelOnboarding } from './components/funnel-onboarding'

export default function FunnelStartPage() {
  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">Build your plan</h1>
          <p className="text-zinc-500 text-sm mt-1">3 quick questions · No account needed yet</p>
        </div>
        <FunnelOnboarding />
      </div>
    </main>
  )
}
