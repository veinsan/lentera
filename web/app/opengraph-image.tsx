import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { fmtInt } from "@/lib/format";
import { landing } from "@/lib/landing";

export const alt = "Lentera: dari prediksi minggu ke-4 ke rencana kontak setiap konselor";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The link preview: the generated night plate with the promise and two numbers from the landing artifact.
export default async function Image() {
  const sky = await readFile(join(process.cwd(), "public/atlas/night-sky-og.jpg"));
  const { cohort, plan } = landing;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", color: "#eaf1ff", fontFamily: "sans-serif" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`data:image/jpeg;base64,${sky.toString("base64")}`} alt="" width={1200} height={630} style={{ position: "absolute", inset: 0 }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", width: "100%" }}>
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -1 }}>Lentera</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2, maxWidth: 900 }}>
              Dari prediksi minggu ke-4 ke rencana kontak setiap konselor.
            </div>
            {/* One text node: Satori needs display flex on a div with several children. */}
            <div style={{ fontSize: 28, color: "#a9b8d9" }}>
              {`${fmtInt(cohort.flagged)} dari ${fmtInt(cohort.scored)} mahasiswa ter-flag, ${plan.advisors} konselor menjangkau ${fmtInt(plan.reached)} yang berisiko`}
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
