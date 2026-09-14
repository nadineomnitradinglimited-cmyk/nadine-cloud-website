"use client";

export default function InlineDomainSearch() {
  return (
    <div className="lookup" aria-label="Domain name search" style={{ maxWidth: "100%" }}>
      <div className="lookup-bar">
        <span className="prompt" aria-hidden="true">
          &gt;
        </span>
        <input
          id="domInput"
          type="text"
          placeholder="yourbusiness"
          aria-label="Domain name"
          onKeyDown={(e) => {
            if (e.key === "Enter") window.lookupDomain?.();
          }}
        />
        <button onClick={() => window.lookupDomain?.()}>Search domain</button>
      </div>
      <div className="lookup-result" id="domResult">
        Type a name to check .com, .org, .net and more
      </div>
    </div>
  );
}
