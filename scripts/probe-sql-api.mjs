const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

const endpoints = ["/pg/query", "/sql", "/database/query", "/rest/v1/rpc/exec"];
for (const ep of endpoints) {
  const res = await fetch(url + ep, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: "select 1 as ok" }),
  });
  console.log(ep, res.status, (await res.text()).slice(0, 120));
}
