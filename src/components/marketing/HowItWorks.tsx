const steps = [
  { title: "Create your profile", body: "Register with your name, email, and phone number." },
  { title: "Get verified by our staff", body: "A staff member reviews your details and marks your KYC as verified." },
  { title: "We open your accounts", body: "Staff or an admin opens your first savings, current, or business account." },
  { title: "Bank from anywhere", body: "Set your PIN, then transfer, request, and apply for loans." },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <h2 className="font-display text-3xl font-medium sm:text-4xl">How it works</h2>
      <p className="mt-3 max-w-xl text-muted">This is a real sequence, not a marketing slogan.</p>
      <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => (
          <li key={step.title} className="card p-6">
            <span className="font-display text-4xl font-medium text-brand-soft-foreground">{index + 1}</span>
            <h3 className="mt-4 font-display text-lg font-medium">{step.title}</h3>
            <p className="mt-2 text-sm text-muted">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
