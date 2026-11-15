import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Relay",
    short_name: "Relay",
    description: "Find people and places that can help with what you have in mind.",
    start_url: "/",
    display: "standalone",
    background_color: "#fcfaf8",
    theme_color: "#e0d6f5",
    icons: [
      { src: "/brand/relay-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/relay-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
