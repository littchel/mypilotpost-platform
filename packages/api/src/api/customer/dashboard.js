export async function getCustomerDashboardSummary(request, env, auth) {
  return new Response(
    JSON.stringify({
      brand_id: auth.brand_id,
      status: "ok",
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}
