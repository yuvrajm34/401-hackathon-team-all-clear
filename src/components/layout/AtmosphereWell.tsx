/**
 * Image and wash live only in the content well. Chrome (sidebar, header,
 * ticker, tab bar) sits outside this layer and stays opaque.
 */
export function AtmosphereWell() {
  return (
    <div className="atmosphere-well print:hidden" aria-hidden="true">
      <div className="atmosphere-well-photo" />
      <div className="atmosphere-well-scrim" />
    </div>
  );
}
