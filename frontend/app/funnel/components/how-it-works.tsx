export function HowItWorks() {
  const steps = [
    {
      number: '1',
      title: 'Answer 3 questions',
      description: 'Height, weight, goal, activity level. Takes under a minute.',
    },
    {
      number: '2',
      title: 'Get your free calorie plan',
      description: 'Your exact TDEE, calorie target, and macro split — calculated from your biometrics.',
    },
    {
      number: '3',
      title: 'Unlock meals + coaching for $9/mo',
      description: 'Full 7-day meal plan, weekly schedule, and AI coaching insights.',
    },
  ]

  return (
    <section className="px-4 py-12 max-w-3xl mx-auto">
      <h2 className="text-2xl font-semibold text-white text-center mb-10">How it works</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
        {steps.map((step) => (
          <div key={step.number} className="flex flex-col items-center text-center gap-3">
            <span className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white font-bold text-lg">
              {step.number}
            </span>
            <h3 className="text-white font-medium">{step.title}</h3>
            <p className="text-zinc-400 text-sm">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
