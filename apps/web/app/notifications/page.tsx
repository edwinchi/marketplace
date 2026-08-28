export const metadata = { title: "Notifications — AfroDeals" };

// The notifications table/UI doesn't exist yet — see app/messages/page.tsx for the same honest-
// placeholder rationale.
export default function NotificationsPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="mb-2 text-xl font-semibold">Notifications are coming soon</h1>
      <p className="text-sm text-muted-foreground">
        Offer alerts, saved-search matches, and order updates will land here once notifications
        are built.
      </p>
    </div>
  );
}
