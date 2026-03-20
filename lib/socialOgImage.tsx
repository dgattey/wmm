import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const socialOgImageSize = { width: 1200, height: 630 } as const;

export const socialOgImageContentType = "image/png";

/** Shared by Open Graph and Twitter metadata routes — no request or portfolio data. */
export const socialOgImageAlt =
  "WMM — Where's my money? One clear view of what you own and how it fits together";

/** Logo is taller than the canvas so it bleeds top/bottom; pulled left so part is clipped. */
const LOGO_PX = 668;
const LOGO_LEFT = -278;
const LOGO_TOP = Math.round((socialOgImageSize.height - LOGO_PX) / 2);

export async function createSocialOgImage(): Promise<ImageResponse> {
  const svg = await readFile(
    join(process.cwd(), "public/icon.svg"),
    "utf8"
  );
  const iconSrc = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(145deg, #fafafa 0%, #eef1f6 55%, #e8ecf4 100%)",
          fontFamily:
            'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders this to PNG */}
        <img
          src={iconSrc}
          width={LOGO_PX}
          height={LOGO_PX}
          alt=""
          style={{
            position: "absolute",
            left: LOGO_LEFT,
            top: LOGO_TOP,
            width: LOGO_PX,
            height: LOGO_PX,
          }}
        />
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            height: "100%",
            flexDirection: "column",
            justifyContent: "center",
            boxSizing: "border-box",
            padding: "112px 80px 112px 378px",
            maxWidth: 900,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 22,
              }}
            >
              <div
                style={{
                  fontSize: 92,
                  fontWeight: 700,
                  letterSpacing: "-0.04em",
                  color: "#1a1f2e",
                  lineHeight: 1,
                }}
              >
                WMM
              </div>
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 600,
                  color: "#5B7BA8",
                  letterSpacing: "-0.02em",
                }}
              >
                {"Where\u2019s my money?"}
              </div>
            </div>
            <div
              style={{
                fontSize: 30,
                fontWeight: 400,
                color: "#4b5563",
                lineHeight: 1.42,
                marginTop: 80,
                maxWidth: 720,
              }}
            >
              What you own, where it sits—and how it fits together, clear enough to
              act on.
            </div>
          </div>
        </div>
      </div>
    ),
    { ...socialOgImageSize }
  );
}
