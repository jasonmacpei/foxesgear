import { test, expect } from "@playwright/test";

test("homepage and shop honor the current store state", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /Premium team apparel for players and families|We’re currently closed/,
  );
  const closed = await page
    .getByRole("heading", { name: "We’re currently closed", exact: true })
    .isVisible();
  if (closed) {
    await expect(page.getByRole("link", { name: "Shop Now" })).toHaveCount(0);
    expect((await page.request.post("/api/checkout", { data: {} })).status()).toBe(403);
  }
  await page.getByRole("link", { name: "Shop", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: closed ? "Store Closed" : "Shop", exact: true }),
  ).toBeVisible();
});

test("checkout page renders", async ({ page }) => {
  await page.goto("/checkout");
  await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();
});
