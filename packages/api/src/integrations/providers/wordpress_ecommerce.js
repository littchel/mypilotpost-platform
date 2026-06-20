/**
 * WordPress eCommerce (WooCommerce) Provider Adapter
 */

export async function normalize(tokenData, env) {
  return {
    account_id: "woocommerce",
    platform_username: "WooCommerce Store",
    meta: {}
  };
}
