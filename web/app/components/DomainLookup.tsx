"use client";

declare global {
  interface Window {
    lookupDomain?: () => void;
  }
}

// Big centred domain search on the home page (the actual check lives in /js/main.js → lookupDomain).
export default function DomainLookup() {
  return (
    <>
      <div className="nc-search">
        <input
          id="domInput"
          type="text"
          placeholder="Register a domain name to start"
          aria-label="Domain name"
          onKeyDown={(e) => {
            if (e.key === "Enter") window.lookupDomain?.();
          }}
        />
        <button onClick={() => window.lookupDomain?.()}>Search</button>
      </div>
      <div className="nc-result" id="domResult" aria-live="polite"></div>
    </>
  );
}
