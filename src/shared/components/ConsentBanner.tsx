export function ConsentBanner({ onAccept }: { onAccept: () => void }) {
  return (
    <div className="consent" role="dialog" aria-modal="true" aria-labelledby="consent-title">
      <h2 id="consent-title">Data consent</h2>
      <p>We store your settings locally on this device. No data leaves your browser.</p>
      <button className="btn" onClick={onAccept} autoFocus>
        I understand
      </button>
    </div>
  );
}
