import { test, expect } from "@playwright/test";

test("homepage highlights the F1 flagship", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Jules Tack\. Builds with AI\. Ships seriously\./i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /F1 prediction lab, live\./i })).toBeVisible();
});

test("projects archive links into the F1 case study", async ({ page }) => {
  await page.goto("/projects");

  await expect(page.getByRole("heading", { name: /selected work/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /f1 prediction lab/i })).toBeVisible();
});

test("F1 hub shows the live system framing", async ({ page }) => {
  await page.goto("/projects/f1");

  await expect(page.getByRole("heading", { name: /F1 prediction lab/i })).toBeVisible();
  await expect(page.getByText(/recruiter-facing ML case study/i)).toBeVisible();
});

test("season explorer renders the 3D surface on desktop", async ({ page }) => {
  await page.goto("/projects/f1/season/2025?target=race_points");

  await expect(page.getByText("3D season landscape")).toBeVisible();
  await expect(page.locator("canvas").first()).toBeVisible();
});

test("season explorer falls back to the matrix on mobile reduced-motion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/projects/f1/season/2025?target=race_points");

  await expect(page.getByText("Fallback matrix")).toBeVisible();
});

test("race dossier renders auto-refresh framing", async ({ page }) => {
  await page.goto("/projects/f1/race/2025/24?target=race_points");

  await expect(page.getByText(/retrains after every F1 session/i)).toBeVisible();
  await expect(page.getByText(/Summary/i).first()).toBeVisible();
});
