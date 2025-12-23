import { test, expect } from "@playwright/test";
import path from "path";

const imagePath = path.resolve(
  __dirname,
  "../stitch_main_menu_home_screen/picture_challenge_start/screen.png"
);
const pdfPath = path.resolve(__dirname, "./fixtures/demo.pdf");

test("upload image -> question -> answer -> score", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Picture Challenge" }).click();
  await page.getByRole("button", { name: "Picture Challenge" }).click();
  const upload = page.getByLabel("Upload from Gallery").locator("input");
  await upload.setInputFiles(imagePath);
  await page.waitForTimeout(3500);
  await expect(page.getByText("Question")).toBeVisible({ timeout: 15000 });
  await page.getByLabel("Answer option 1").click();
  await expect(page.getByText("Score")).toBeVisible();
});

test("doc challenge -> upload -> answer -> export", async ({ page }) => {
  await page.goto("/module2");
  const fileInput = page.getByLabel("Dropzone").locator("input");
  await fileInput.setInputFiles(pdfPath);
  const startButton = page.getByRole("button", { name: "Start Challenge" });
  await expect(startButton).toBeEnabled({ timeout: 15000 });
  await startButton.click();
  await expect(page.getByText("Submit Answer")).toBeVisible({ timeout: 15000 });
  await page.getByLabel("Answer input").fill("Hello World");
  await page.getByRole("button", { name: "Submit Answer" }).click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Export CSV" }).click();
});
