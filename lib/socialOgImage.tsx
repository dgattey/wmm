import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const socialOgImageSize = { width: 1200, height: 630 } as const;

export const socialOgImageContentType = "image/png";

/** Shared by Open Graph and Twitter metadata routes — no request or portfolio data. */
export const socialOgImageAlt =
  "WMM, Where\u2019s my money? One clear view of what you own and how it all fits together";

/** Square logo taller than canvas (630): flex-center bleeds top/bottom; clip column + negative margin (Satori-safe). */
const LOGO_PX = 796;
/** Width reserved for the logo (text column starts after this). */
const LOGO_CLIP_W = 620;
/** Shift image left so its right edge meets the clip column edge—nothing cropped on the right. */
const LOGO_PULL_LEFT = LOGO_PX - LOGO_CLIP_W;

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
          display: "flex",
          flexDirection: "row",
          overflow: "hidden",
          background: "linear-gradient(145deg, #fafafa 0%, #eef1f6 55%, #e8ecf4 100%)",
          fontFamily:
            'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div
          style={{
            width: LOGO_CLIP_W,
            height: "100%",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            overflow: "hidden",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders this to PNG */}
          <img
            src={iconSrc}
            width={LOGO_PX}
            height={LOGO_PX}
            alt=""
            style={{
              marginLeft: -LOGO_PULL_LEFT,
              flexShrink: 0,
            }}
          />
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            boxSizing: "border-box",
            minWidth: 0,
            padding: "112px 72px 112px 28px",
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
                gap: 26,
              }}
            >
              <div
                style={{
                  fontSize: 132,
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
                  fontSize: 46,
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
                fontSize: 34,
                fontWeight: 400,
                color: "#4b5563",
                lineHeight: 1.4,
                marginTop: 56,
                maxWidth: 720,
              }}
            >
              What you own, where it sits, and how it all fits together.
            </div>
          </div>
        </div>
      </div>
    ),
    { ...socialOgImageSize }
  );
}
