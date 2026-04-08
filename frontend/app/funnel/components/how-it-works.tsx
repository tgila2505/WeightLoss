export function HowItWorks() {
  const steps = [
    {
      number: '1',
      title: 'Answer 3 questions',
      description: 'Height, weight, goal, and activity level. Takes under a minute.'
    },
    {
      number: '2',
      title: 'Get your free calorie plan',
      description:
        'Your exact TDEE, calorie target, and macro split calculated from your biometrics.'
    },
    {
      number: '3',
      title: 'Unlock meals + coaching for $9/mo',
      description: 'Full 7-day meal plan, weekly schedule, and AI coaching insights.'
    }
  ];

  return (
    <section className="px-4 py-12">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-10 text-center text-2xl font-semibold text-slate-900">
          How it works
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="flex flex-col items-center gap-4 rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-lg font-bold text-blue-700">
                {step.number}
              </span>
              <h3 className="font-medium text-slate-900">{step.title}</h3>
              <p className="text-sm leading-6 text-slate-500">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
