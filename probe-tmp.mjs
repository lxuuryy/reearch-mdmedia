import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";

const app = initializeApp({
  apiKey: "AIzaSyDCuEs_N8in_7h2Esmii91UTObj8r7n344",
  authDomain: "test-agent-88a4c.firebaseapp.com",
  projectId: "test-agent-88a4c",
  appId: "1:574214432022:web:a7b9f9bfccfc5df45cdc37",
});
const db = getFirestore(app);

for (const name of ["responses", "what-drives-you-responses"]) {
  // read
  try {
    const snap = await getDocs(collection(db, name));
    console.log(`${name} READ: ok (${snap.size} docs)`);
  } catch (e) {
    console.log(`${name} READ: ${e.code}`);
  }
  // minimal create matching the person.name validation
  try {
    const ref = await addDoc(collection(db, name), { person: { name: "probe" } });
    console.log(`${name} CREATE: ok`);
    try {
      await deleteDoc(doc(db, name, ref.id));
      console.log(`${name} DELETE: ok (probe cleaned up)`);
    } catch (e) {
      console.log(`${name} DELETE: ${e.code} — LEFT PROBE DOC ${ref.id}`);
    }
  } catch (e) {
    console.log(`${name} CREATE: ${e.code}`);
  }
}
process.exit(0);
