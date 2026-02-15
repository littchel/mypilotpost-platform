export async function requireAdmin() {
  throw new Response(
    JSON.stringify({ error: "Admin access denied" }),
    { status: 403, headers: { "Content-Type": "application/json" } }
  );
}
