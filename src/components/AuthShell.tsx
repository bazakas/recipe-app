import { ThemeToggle } from "@/components/ThemeToggle";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 py-12">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="label-caps mb-2 text-accent">Recipe Book</p>
          <h1 className="font-title text-3xl">{title}</h1>
          <p className="mt-2 text-sm text-muted">{subtitle}</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow)]">
          {children}
        </div>
      </div>
    </main>
  );
}
