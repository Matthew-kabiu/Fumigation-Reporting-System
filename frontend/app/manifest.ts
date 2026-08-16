import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fumivanta Field",
    short_name: "Fumivanta",
    description: "From treatment to trusted report.",
    start_url: "/field",
    display: "standalone",
    background_color: "#f3efe5",
    theme_color: "#171a16",
    orientation: "portrait",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
