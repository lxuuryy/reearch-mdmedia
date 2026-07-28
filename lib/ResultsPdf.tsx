import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Driver } from "./quiz-data";

export type PdfData = {
  person: { name: string; email: string; team: string };
  completedAt: string;
  totals: { d: Driver; score: number }[];
  topTwo: { d: Driver; score: number }[];
  transcript: { q: string; a: string }[];
};

const INK = "#1C3125";
const MUTED = "#6C7A6E";
const FAINT = "#A6AEA0";
const RULE = "#E3E6DA";
const PANEL = "#F4F6EF";
const BAR_BG = "#EFF2E9";
const BAR_OFF = "#C9D2BE";

const s = StyleSheet.create({
  page: { paddingTop: 46, paddingBottom: 52, paddingHorizontal: 52, fontFamily: "Helvetica", color: INK },

  eyebrow: { fontSize: 8, letterSpacing: 1.6, color: FAINT, textTransform: "uppercase" },
  name: { fontSize: 10, color: MUTED, marginTop: 3 },
  h1: { fontSize: 26, fontFamily: "Helvetica-Bold", marginTop: 14, letterSpacing: -0.4 },
  lede: { fontSize: 10, lineHeight: 1.55, color: "#48584B", marginTop: 8, maxWidth: 380 },

  sectionLabel: { fontSize: 8, letterSpacing: 1.6, color: FAINT, textTransform: "uppercase", marginBottom: 12 },
  section: { marginTop: 28 },

  row: { marginBottom: 12 },
  rowHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 },
  rowName: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  rowNameOff: { fontSize: 11, color: MUTED },
  rowScore: { fontSize: 9, color: FAINT },
  track: { height: 6, borderRadius: 3, backgroundColor: BAR_BG },
  fill: { height: 6, borderRadius: 3 },
  blurb: { fontSize: 9, color: MUTED, marginTop: 4 },

  panel: { backgroundColor: PANEL, borderRadius: 10, padding: 18, marginTop: 4 },
  topName: { fontSize: 13, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  topDesc: { fontSize: 9.5, lineHeight: 1.55, color: "#48584B" },
  topWatch: { fontSize: 9, lineHeight: 1.5, color: FAINT, marginTop: 3 },
  topBlock: { marginBottom: 14 },

  qa: { marginBottom: 9, paddingBottom: 8, borderBottomWidth: 0.5, borderBottomColor: RULE },
  q: { fontSize: 8.5, color: FAINT, lineHeight: 1.4 },
  a: { fontSize: 10, color: INK, lineHeight: 1.45, marginTop: 2 },

  closing: { fontSize: 9.5, lineHeight: 1.55, color: "#48584B", marginTop: 22 },
  footer: {
    position: "absolute",
    bottom: 26,
    left: 52,
    right: 52,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: FAINT,
  },
});

export function ResultsPdf({ data }: { data: PdfData }) {
  const { person, completedAt, totals, topTwo, transcript } = data;
  const topNames = topTwo.map((t) => t.d.name);

  return (
    <Document title={`What drives you — ${person.name || "Results"}`} author="MD Media">
      <Page size="A4" style={s.page} wrap>
        <View>
          <Text style={s.eyebrow}>MD Media · What drives you</Text>
          <Text style={s.name}>
            {person.name || "Anonymous"}
            {person.team ? ` · ${person.team}` : ""} · {completedAt}
          </Text>
          <Text style={s.h1}>{topNames.join(" & ")}</Text>
          <Text style={s.lede}>
            Everyone has all six. Your top two are the ones that, when they&apos;re missing, make work feel flat.
          </Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionLabel}>Your six drivers</Text>
          {totals.map((t) => {
            const top = topNames.includes(t.d.name);
            return (
              <View key={t.d.name} style={s.row} wrap={false}>
                <View style={s.rowHead}>
                  <Text style={top ? s.rowName : s.rowNameOff}>{t.d.name}</Text>
                  <Text style={s.rowScore}>{t.score}/20</Text>
                </View>
                <View style={s.track}>
                  <View style={[s.fill, { width: `${(t.score / 20) * 100}%`, backgroundColor: top ? INK : BAR_OFF }]} />
                </View>
                <Text style={s.blurb}>{t.d.blurb}</Text>
              </View>
            );
          })}
        </View>

        <View style={s.section} wrap={false}>
          <Text style={s.sectionLabel}>What your top two mean</Text>
          <View style={s.panel}>
            {topTwo.map((t, k) => (
              <View key={t.d.name} style={k === topTwo.length - 1 ? undefined : s.topBlock}>
                <Text style={s.topName}>{t.d.name}</Text>
                <Text style={s.topDesc}>{t.d.desc}</Text>
                <Text style={s.topWatch}>{t.d.watch}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={s.closing}>
          Bring your top two and your answer to the third reflection question to your goal-setting conversation. We&apos;ll use it to shape your quarter and how
          your work gets recognised — because &quot;well done&quot; means different things to different people.
        </Text>

        <View style={s.footer} fixed>
          <Text>MD Media · What drives you</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>

      <Page size="A4" style={s.page} wrap>
        <Text style={s.sectionLabel}>Your answers</Text>
        {transcript.map((row, k) => (
          <View key={k} style={s.qa} wrap={false}>
            <Text style={s.q}>{row.q}</Text>
            <Text style={s.a}>{row.a}</Text>
          </View>
        ))}

        <Text style={s.closing}>
          Framework: the six human needs (Tony Robbins) — a lens for reading what people want from work, not a validated psychometric. Scenario format adapted
          from Steven Bartlett&apos;s culture test.
        </Text>

        <View style={s.footer} fixed>
          <Text>
            {person.name || "Anonymous"} · {completedAt}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
