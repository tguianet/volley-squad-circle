const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
const res = await fetch(`${url}/rest/v1/`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
const text = await res.text();
const re = /"\/rpc\/([^"]+)"/g;
const fns = [...text.matchAll(re)].map((m) => m[1]).sort();
console.log("rpc count:", fns.length);
for (const f of fns.filter(
  (x) =>
    x.includes("court") ||
    x.includes("challenge") ||
    x.includes("ranking") ||
    x.includes("available"),
)) {
  console.log(f);
}
