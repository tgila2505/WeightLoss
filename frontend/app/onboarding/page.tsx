import { OnboardingForm } from './components/onboarding-form';

export default function OnboardingPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '32px 16px',
        display: 'flex',
        justifyContent: 'center'
      }}
    >
      <OnboardingForm />
    </main>
  );
}
