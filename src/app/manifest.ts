import type { MetadataRoute } from "next";
import { SITE } from "@/lib/utils";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE.name} — Portfolio`,
    short_name: SITE.name,
    description: SITE.tagline,
    start_url: "/",
    display: "standalone",
    background_color: "#050505",
    theme_color: "#050505",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
