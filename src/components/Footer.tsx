import pkg from '../../package.json';

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container py-10">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Stratford Foxes Basketball Association
          </div>
          <div className="text-xs text-muted-foreground">
            v{pkg.version} · Built with Next.js, Supabase, and Stripe
          </div>
        </div>
      </div>
    </footer>
  );
}


