import React from "react";

export default function Image({ src, ...props }) {
  return (
    <p>
      <img src={src} style={{ maxWidth: "100%" }} crossOrigin="anonymous" {...props} />
    </p>
  );
}
