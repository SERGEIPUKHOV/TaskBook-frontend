import { expect, test, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";

const APP_ORIGIN = process.env.E2E_BASE_URL ?? "http://localhost:3001";
const API_BASE_URL = process.env.E2E_API_BASE_URL ?? "http://localhost:8000/api/v1";
const DEMO_EMAIL = process.env.E2E_DEMO_EMAIL ?? "demo@taskbook.app";
const DEMO_PASSWORD = process.env.E2E_DEMO_PASSWORD ?? "taskbook123";

async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.locator("#login-password").fill(password);
  await page.getByRole("button", { name: "Войти" }).click();
}

async function registerUser(request: APIRequestContext, prefix: string): Promise<{ email: string; password: string }> {
  const email = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const password = "password123";
  const response = await request.post(`${API_BASE_URL}/auth/register`, {
    data: { email, password },
  });

  expect(response.ok()).toBeTruthy();
  return { email, password };
}

async function seedInvalidSession(context: BrowserContext, page: Page): Promise<void> {
  await context.addCookies([
    {
      name: "taskbook_session",
      value: "stale-token",
      url: APP_ORIGIN,
    },
  ]);
}

test("login and critical dashboard/month/week/profile routes work on the API-backed frontend", async ({ page }) => {
  await login(page, DEMO_EMAIL, DEMO_PASSWORD);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText("Текущий фокус недели")).toBeVisible();

  await page.getByRole("link", { name: "Открыть текущую неделю" }).click();
  await expect(page).toHaveURL(/\/week\/\d{4}\/\d+$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Неделя");

  await page.getByRole("link", { name: "К дашборду" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole("link", { name: "Открыть текущий месяц" }).click();
  await expect(page).toHaveURL(/\/month\/\d{4}\/\d+$/);
  await expect(page.getByRole("main").getByText("Месячный разворот")).toBeVisible();

  await page.getByRole("link", { name: "Профиль" }).first().click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByText("Смена пароля")).toBeVisible();

  await page.locator("main").getByRole("button", { name: "Выйти" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("frontend shows a stable empty week and month for a new API-backed user", async ({ page, request }) => {
  const credentials = await registerUser(request, "phase3-empty");

  await login(page, credentials.email, credentials.password);
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto("/week/2026/11");
  await expect(page.getByText("Задач на эту неделю пока нет.")).toBeVisible();
  await expect(page.getByPlaceholder("Цель этой недели...")).toHaveValue("");

  await page.goto("/month/2026/3");
  await expect(page.getByText("Блоки планирования месяца")).toBeVisible();
  await expect(page.getByPlaceholder("Главная задача месяца...")).toHaveValue("");
});

test("expired session is cleared and redirected back to login", async ({ context, page }) => {
  await seedInvalidSession(context, page);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: "Войти" })).toBeVisible();
});

test("network failure on login shows a user-facing error without crashing the page", async ({ page }) => {
  await page.route(`${API_BASE_URL}/auth/login`, async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ detail: "Service unavailable" }),
    });
  });

  await page.goto("/login");
  await page.getByLabel("Email").fill(DEMO_EMAIL);
  await page.locator("#login-password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Войти" }).click();

  await expect(page.getByText("Ошибка сети. Проверьте подключение и попробуйте снова.")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});
