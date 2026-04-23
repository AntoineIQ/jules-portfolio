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

test("race dossier can call the live model probe", async ({ page }) => {
  await page.route("**/api/f1/predict/race", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        model_version: "playwright-probe",
        generated_at: "2026-04-23T12:00:00Z",
        summary: {
          top_driver: { driver: "Max Verstappen", team: "Red Bull", p: 0.71 },
          strongest_team: { team: "Red Bull", mean_p: 0.63 },
          field_average: 0.28,
          prediction_spread: 0.54,
        },
        drivers: [
          {
            driver: "Max Verstappen",
            team: "Red Bull",
            p: 0.71,
            actual: 1,
            top_factors: [
              { feature: "grid_position", value: -0.21 },
              { feature: "driver_points_last_5", value: 0.19 },
            ],
          },
          {
            driver: "Lando Norris",
            team: "McLaren",
            p: 0.59,
            actual: 0,
            top_factors: [{ feature: "driver_points_last_5", value: 0.12 }],
          },
        ],
      }),
    });
  });

  await page.goto("/projects/f1/race/2025/24?target=race_points");

  await expect(page.getByText("Live model probe")).toBeVisible();
  await page.getByRole("button", { name: /run live model/i }).click();

  await expect(page.getByText("Snapshot")).toBeVisible();
  await expect(page.getByText(/Max Verstappen/).first()).toBeVisible();
  await expect(page.getByText(/playwright-probe/)).toBeVisible();
});
