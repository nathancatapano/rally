import { Button } from "@/components/ui/button";

const stack = ["Next.js", "TypeScript", "Tailwind", "shadcn/ui"];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-12 px-6 py-16 sm:px-10 sm:py-24">
        <div className="flex flex-col items-start gap-5">
          <p className="text-sm font-medium tracking-wide text-muted-foreground">
            Starting point
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Rally
          </h1>
          <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            Rally is the Next.js app this repository starts from. The shell,
            TypeScript, Tailwind, and shadcn/ui are already in place, so the
            next change can be the product itself.
          </p>
          <Button
            nativeButton={false}
            render={<a href="#stack" />}
            size="lg"
          >
            View the stack
          </Button>
        </div>
        <section id="stack" className="scroll-mt-8 border-t border-border pt-8">
          <h2 className="text-sm font-medium text-muted-foreground">Stack</h2>
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {stack.map((item) => (
              <li
                key={item}
                className="rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
