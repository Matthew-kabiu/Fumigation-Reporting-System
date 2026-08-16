import { ImageResponse } from "next/og";
import { ogFonts } from "./fonts";

// Social-image palette — mirrors the brand tokens in globals.css (ink, paper,
// lime, muted line). Values are pinned here because server-rendered PNGs cannot
// read CSS custom properties.
const INK = "#171a16";
const LINE = "#33382f";
const PAPER = "#f3efe5";
const MUTED = "#b9beb5";
const LIVE = "#c7f464";

export function renderSocialImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: INK,
          color: PAPER,
          padding: "72px 80px",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            backgroundImage:
              "linear-gradient(rgba(243,239,229,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(243,239,229,0.05) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "56px",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              backgroundColor: PAPER,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: INK,
              fontWeight: 700,
              fontSize: "30px",
            }}
          >
            F
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <span
              style={{
                fontSize: "40px",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                lineHeight: 1,
              }}
            >
              Fumivanta
            </span>
            <span
              style={{
                fontFamily: "IBM Plex Mono",
                fontSize: "18px",
                color: MUTED,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
              }}
            >
              Field · Desk · Portal
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <div
              style={{
                width: "14px",
                height: "14px",
                borderRadius: "50%",
                backgroundColor: LIVE,
              }}
            />
            <span
              style={{
                fontFamily: "IBM Plex Mono",
                fontSize: "20px",
                color: MUTED,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
              }}
            >
              Operational chain 04 / 04
            </span>
          </div>
          <h1
            style={{
              margin: 0,
              display: "flex",
              flexDirection: "column",
              fontSize: "108px",
              fontWeight: 700,
              letterSpacing: "-0.05em",
              lineHeight: 0.92,
              textWrap: "balance",
            }}
          >
            <span>From treatment</span>
            <span>
              to <span style={{ color: LIVE }}>trusted report.</span>
            </span>
          </h1>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "auto",
            borderTop: `1px solid ${LINE}`,
            paddingTop: "28px",
            fontFamily: "IBM Plex Mono",
            fontSize: "18px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: MUTED,
          }}
        >
          <span>Fumigation operations and reporting</span>
          <span style={{ color: LIVE }}>Offline-first field PWA</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: ogFonts,
    },
  );
}
