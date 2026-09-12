import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-subtle">
        404
      </p>
      <h1 className="mt-1 text-xl font-semibold text-ink">
        That page does not exist
      </h1>
      <p className="mt-1.5 text-sm text-ink-muted">
        The link may be out of date, or the record it pointed at was deleted
        from this browser.
      </p>
      <ButtonLink href="/" className="mt-5">
        Back to the dashboard
      </ButtonLink>
    </div>
  );
}
