import { ImageResponse } from "next/og";
import { SITE } from "@/lib/utils";

export const runtime = "edge";
export const alt = `${SITE.name} — AI/ML & Full-Stack Developer`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Generated Open Graph card — no static asset needed. */
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#050505",
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(124,92,255,0.25), transparent 50%), radial-gradient(circle at 80% 70%, rgba(34,211,238,0.2), transparent 50%)",
          color: "#f5f5f7",
          fontSize: 84,
          fontWeight: 700,
          letterSpacing: "-0.04em",
        }}
      >
        <div style={{ display: "flex" }}>{SITE.name}</div>
        <div
          style={{
            display: "flex",
            marginTop: 24,
            fontSize: 30,
            fontWeight: 400,
            color: "#8f8f98",
            letterSpacing: "0.02em",
          }}
        >
          {SITE.tagline}
        </div>
      </div>
    ),
    size,
  );
}
