import { useState } from "react";

// Store tile mark: the merchant's official icon when available, otherwise the
// existing letter tile. Falls back to the letter if the icon fails to load.
function StoreLogo({ store }) {
  const [failed, setFailed] = useState(false);
  const showImage = store.logo && !failed;

  return (
    <span className={`store-card__logo ${showImage ? "has-image" : ""}`} aria-hidden="true">
      {showImage ? (
        <img
          src={store.logo}
          alt=""
          width="58"
          height="58"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        store.letter
      )}
    </span>
  );
}

export default StoreLogo;
