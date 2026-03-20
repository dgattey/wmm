import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const socialOgImageSize = { width: 1200, height: 630 } as const;

export const socialOgImageContentType = "image/png";

/** Shared by Open Graph and Twitter metadata routes — no request or portfolio data. */
export const socialOgImageAlt =
  "WMM — Where's my money? One clear view of what you own and how it fits together";

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
          alignItems: "center",
          justifyContent: "flex-start",
          padding: "72px 80px",
          background: "linear-gradient(145deg, #fafafa 0%, #eef1f6 55%, #e8ecf4 100%)",
          fontFamily:
            'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 96,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders this to PNG */}
          <img src={iconSrc} width={360} height={360} alt="" />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              maxWidth: 780,
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
