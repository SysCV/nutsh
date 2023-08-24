import React from "react";
import ReactPlayer from "react-player";

export default function VideoPlayer({ url }) {
  return (
    <p>
      <ReactPlayer
        style={{ maxWidth: "100%" }}
        controls
        url={url}
        config={{ file: { attributes: { crossOrigin: "true" } } }}
      />
    </p>
  );
}
