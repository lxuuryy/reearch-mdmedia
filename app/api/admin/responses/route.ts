import { NextResponse } from "next/server";
import { collection, deleteDoc, doc, getDocs, orderBy, query } from "firebase/firestore";
import { getDb, RESPONSES_COLLECTION } from "@/lib/firebase";

const PASSWORD = process.env.ADMIN_PASSWORD || "MDMEDIA2026";

export async function POST(req: Request) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  if (password !== PASSWORD) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "Firebase is not configured on the server" }, { status: 500 });
  }

  try {
    const snap = await getDocs(query(collection(db, RESPONSES_COLLECTION), orderBy("completedAt", "desc")));
    const responses = snap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      const completedAt = data.completedAt as { toDate?: () => Date } | undefined;
      return {
        id: d.id,
        ...data,
        completedAt: completedAt?.toDate ? completedAt.toDate().toISOString() : null,
      };
    });
    return NextResponse.json({ responses });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { password, id } = (await req.json().catch(() => ({}))) as { password?: string; id?: string };
  if (password !== PASSWORD) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "Firebase is not configured on the server" }, { status: 500 });
  }

  try {
    await deleteDoc(doc(db, RESPONSES_COLLECTION, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
