export function ArrowGraphic({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 60 14"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M0 7 H54"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="square"
      />
      <path
        d="M46 1 L56 7 L46 13"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="square"
        strokeLinejoin="miter"
        fill="none"
      />
    </svg>
  );
}

export function ArrowDiagonal({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M6 18 L18 6 M8 6 H18 V16"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

export function ArrowBack({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 14" fill="none" aria-hidden className={className}>
      <path d="M60 7 H6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="square" />
      <path
        d="M14 1 L4 7 L14 13"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="square"
        strokeLinejoin="miter"
        fill="none"
      />
    </svg>
  );
}
