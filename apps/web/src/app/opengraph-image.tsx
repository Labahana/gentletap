import { ImageResponse } from "next/og";

export const alt = "GentleTap — AI payment reminders for freelancers with QuickBooks";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px",
          background: "linear-gradient(145deg, #faf8f5 0%, #f4ebe3 55%, #eef7ee 100%)",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              background: "#e07a5f",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "28px",
              fontWeight: 700,
            }}
          >
            G
          </div>
          <span style={{ fontSize: "32px", fontWeight: 700, color: "#2c2825" }}>GentleTap</span>
        </div>
        <div
          style={{
            fontSize: "64px",
            fontWeight: 700,
            lineHeight: 1.08,
            color: "#2c2825",
            maxWidth: "900px",
          }}
        >
          Get paid. Keep the relationship.
        </div>
        <div
          style={{
            marginTop: "28px",
            fontSize: "28px",
            lineHeight: 1.4,
            color: "#6b6560",
            maxWidth: "820px",
          }}
        >
          AI payment reminders for freelancers — synced with QuickBooks, sent from your inbox.
        </div>
      </div>
    ),
    { ...size },
  );
}
