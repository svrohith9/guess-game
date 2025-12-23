import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FlashGame",
    short_name: "FlashGame",
    description: "Image and document flash-card challenges",
    start_url: "/",
    display: "standalone",
    background_color: "#0b111b",
    theme_color: "#0b111b",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml"
      }
    ]
  };
}
