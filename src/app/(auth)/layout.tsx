import { ContourField } from "@/components/brand/contour-field";
import { FurrowLogo } from "@/components/brand/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <ContourField className="text-[var(--accent)]" opacity={0.05} />
      <header className="relative flex h-14 items-center px-6">
        <FurrowLogo />
      </header>
      <main className="relative flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
