// Wordmark with the dimensional "sphere" mark.
function Logo({ onClick, size = "md", as = "button" }) {
  const content = (
    <>
      <span className="logo__orb" aria-hidden="true">
        <span className="logo__orb-shine" />
        <span className="logo__orb-symbol">%</span>
      </span>
      <span className="logo__word">
        Deal<span>Sphere</span>
      </span>
    </>
  );

  if (as === "button" && onClick) {
    return (
      <button
        type="button"
        className={`logo logo--${size}`}
        onClick={onClick}
        aria-label="DealSphere home"
      >
        {content}
      </button>
    );
  }

  return <span className={`logo logo--${size}`}>{content}</span>;
}

export default Logo;
