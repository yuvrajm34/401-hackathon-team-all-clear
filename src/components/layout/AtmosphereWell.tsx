/** Full-viewport backdrop behind the floating app controls and page content. */
export function AtmosphereWell() {
  return (
    <div className="atmosphere-well print:hidden" aria-hidden="true">
      <div className="atmosphere-well-photo" />
      <div className="atmosphere-well-scrim" />
    </div>
  );
}
