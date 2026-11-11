import { test, expect, request as apiRequest } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

loadEnvConfig(process.cwd());
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const cookies: {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "Lax";
}[] = [];
let adminToken = "";

// Explicit opt-in: authenticated checks use an ephemeral session and a disposable account.
const liveQA = process.env.FOXESGEAR_LIVE_QA === "1";
const mailMock = process.env.FOXESGEAR_EMAIL_MOCK_URL;
const liveEmailQA = liveQA && !!mailMock;

test("anonymous users cannot read reports, users, admin RSC, or issue refunds", async ({
  request,
}) => {
  for (const path of ["/api", "/api/reports/printer", "/api/reports/sales", "/api/admin/users"]) {
    const res = await request.get(path);
    expect(res.status(), path).toBe(401);
    expect(res.headers()["cache-control"]).toContain("no-store");
  }
  expect((await request.get("/api/cron/signup-emails")).status()).toBe(401);
  for (const path of [
    "/admin",
    "/admin/orders",
    "/admin/reports",
    "/admin/reports/fulfillment",
    "/admin/users",
    "/admin/seasons",
  ]) {
    const page = await request.get(path, { maxRedirects: 0 });
    expect(page.status(), path).toBe(307);
    expect(page.headers().location).toContain("/login");
    const stream = await request.get(`${path}?_rsc`, { headers: { RSC: "1" } });
    const body = await stream.text();
    expect(body).toContain("/login");
    expect(body).not.toContain("affiliated_player");
  }
  for (const path of [
    "/api/orders/invalid/refund",
    "/api/admin/users",
    "/api/admin/seasons",
    "/api/admin/backfill-from-session",
    "/api/account/setup-completed",
  ]) {
    const res = await request.post(path, { headers: { Origin: baseURL }, data: {} });
    expect(res.status(), path).toBe(401);
  }
});

test("pickup changes require admin access and same origin", async ({ request }) => {
  const pickup = await request.patch("/api/orders/11111111-1111-4111-8111-111111111111/pickup", {
    headers: { Origin: baseURL },
    data: {},
  });
  expect(pickup.status()).toBe(401);
  expect(
    (
      await request.patch("/api/orders/invalid/pickup", {
        headers: { Origin: "https://untrusted.example" },
        data: {},
      })
    ).status(),
  ).toBe(403);
});

test.describe("authenticated admin and season checks", () => {
  test.skip(
    !liveEmailQA,
    "Run local email mock and set FOXESGEAR_LIVE_QA=1 plus FOXESGEAR_EMAIL_MOCK_URL for disposable Auth QA",
  );
  test("public Auth signup cannot create an account", async () => {
    const email = `blocked-signup-qa-${Date.now()}@example.invalid`;
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.signUp({
      email,
      password: "Disposable-public-signup-QA-2026!",
    });
    try {
      expect(error).not.toBeNull();
      expect(data.user).toBeNull();
      const { data: users } = await service.auth.admin.listUsers({ perPage: 1000 });
      expect(users.users.some((u) => u.email === email)).toBe(false);
    } finally {
      if (data.user) await service.auth.admin.deleteUser(data.user.id);
    }
  });
  test.beforeAll(async () => {
    if (!["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname))
      throw new Error("Email QA must run against the local server");
    const check = await fetch(`${mailMock}/health`);
    if (!(await check.json()).mock) throw new Error("Local email mock is required");
    const { data: ownerId, error } = await service.rpc("store_owner_id");
    if (error || !ownerId) throw error || new Error("Owner not configured");
    const { data: account } = await service.auth.admin.getUserById(ownerId);
    const { data: link, error: linkError } = await service.auth.admin.generateLink({
      type: "magiclink",
      email: account.user!.email!,
    });
    if (linkError) throw linkError;
    const auth = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error: loginError } = await auth.auth.verifyOtp({
      token_hash: link.properties.hashed_token,
      type: "magiclink",
    });
    if (loginError || !data.session) throw loginError || new Error("No session");
    adminToken = data.session.access_token;
    const server = createServerClient(url, key, {
      cookies: {
        getAll: () => cookies,
        setAll: (values) => {
          for (const c of values)
            cookies.push({
              name: c.name,
              value: c.value,
              domain: new URL(baseURL).hostname,
              path: "/",
              expires: -1,
              httpOnly: false,
              secure: false,
              sameSite: "Lax",
            });
        },
      },
    });
    await server.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  });
  test.afterAll(async () => {
    if (adminToken) await service.auth.admin.signOut(adminToken, "local");
  });
  test.beforeEach(async ({ context }) => {
    await context.addCookies(cookies);
  });

  test("season report, order navigation, and CSV agree; mobile controls fit", async ({ page }) => {
    await page.goto("/admin/reports");
    await expect(page.getByRole("heading", { name: "Reports", exact: true })).toBeVisible();
    const selector = page.getByRole("combobox", { name: "Season", exact: true });
    await expect(selector.locator("option:checked")).toHaveText("2026–2027 (current)");
    await expect(page.getByText("No paid live orders for this season yet.")).toBeVisible();
    const { data: previous } = await service
      .from("seasons")
      .select("id")
      .eq("starts_on", "2025-07-01")
      .single();
    await selector.selectOption(previous!.id);
    await expect(page).toHaveURL(new RegExp(previous!.id));
    await expect(page.getByText("$4840.00", { exact: true })).toBeVisible();
    const response = await page.request.get(`/api/reports/sales?season=${previous!.id}`);
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain("2025–2026");
    expect(await response.text()).toContain("4840.00");
    const current = await page.request.get("/api/reports/sales");
    expect(await current.text()).not.toContain("4840.00");
    expect((await page.request.get("/api/reports/sales?season=invalid")).status()).toBe(404);
    await page.goto(`/admin/orders?season=${previous!.id}`);
    await expect(page.getByRole("table")).toBeVisible();
    const currentId = await page
      .getByRole("combobox", { name: "Season" })
      .locator("option")
      .filter({ hasText: "2026–2027" })
      .getAttribute("value");
    await page.getByRole("combobox", { name: "Season" }).selectOption(currentId!);
    await expect(page.getByRole("table").locator("tbody tr")).toHaveCount(0);
    await page.goto("/admin/users");
    await expect(page.getByRole("heading", { name: "Add user" })).toBeVisible();
    await expect(page.getByRole("table").getByText("(you)", { exact: false })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Owner · protected", exact: true })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole("navigation", { name: "Admin", exact: true })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({ path: "test-results/admin-users-mobile.png", fullPage: true });
  });

  test("invitation resend identifies the recipient and replaces failure feedback", async ({
    page,
  }) => {
    const people = [
      {
        id: "11111111-1111-4111-8111-111111111111",
        fullName: "Casey Coach",
        email: "casey@example.invalid",
        isAdmin: true,
        isOwner: false,
        disabled: false,
        lastSignIn: null,
        setupComplete: false,
        setupCompletedAt: null,
        invitationEmailStatus: "not_sent",
        invitationSentAt: null as string | null,
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        fullName: "Morgan Coach",
        email: "morgan@example.invalid",
        isAdmin: true,
        isOwner: false,
        disabled: false,
        lastSignIn: null,
        setupComplete: true,
        setupCompletedAt: "2026-11-10T21:00:00Z",
        invitationEmailStatus: "sent",
        invitationSentAt: "2026-11-10T20:00:00Z" as string | null,
      },
    ];
    let fail = true;
    await page.route("**/api/admin/users*", async (route) => {
      const req = route.request();
      if (req.method() === "GET")
        return route.fulfill({ json: { currentUserId: "owner", hasMore: false, users: people } });
      const person = people.find((p) => p.id === req.postDataJSON().userId)!;
      person.invitationEmailStatus = fail ? "failed" : "sent";
      person.invitationSentAt = fail ? null : new Date().toISOString();
      const emailStatus = person.invitationEmailStatus;
      fail = false;
      return route.fulfill({ json: { ok: true, recipient: person, emailStatus } });
    });
    await page.goto("/admin/users");
    await page.getByRole("button", { name: "Send invitation to Casey Coach", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "The account is saved" })).toContainText(
      "casey@example.invalid",
    );
    await expect(
      page.getByRole("table").getByText("Email failed — resend needed", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Resend invitation to Casey Coach", exact: true })
      .click();
    await expect(page.getByRole("status")).toHaveText(
      "Email sent to Casey Coach (casey@example.invalid).",
    );
    await expect(page.getByRole("alert").filter({ hasText: "The account is saved" })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("button", { name: "Send password reset to Morgan Coach", exact: true }),
    ).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(
      page
        .getByRole("article", { name: "Account for Casey Coach" })
        .getByRole("button", { name: "Resend invitation to Casey Coach", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({ path: "test-results/email-invitations-mobile.png", fullPage: true });
  });

  test("create account, set own password, grant/revoke access, prevent self-lockout and cross-site changes", async ({
    page,
  }) => {
    const email = `foxesgear-qa-${Date.now()}@example.invalid`;
    let testUserId = "";
    const adminApi = await apiRequest.newContext({
      baseURL,
      storageState: { cookies, origins: [] },
    });
    try {
      await page.goto("/admin/users");
      await page.getByLabel("Full name", { exact: true }).fill("Disposable QA User");
      await page.getByLabel("Email", { exact: true }).fill(email);
      await page.getByRole("button", { name: "Add user and email invitation" }).click();
      await expect(page.getByRole("status")).toContainText(
        `Email sent to Disposable QA User (${email}).`,
      );
      const mailbox = async (recipient: string) =>
        (await (
          await page.request.get(`${mailMock}/messages?to=${encodeURIComponent(recipient)}`)
        ).json()) as { text: string; subject: string; to: string[] }[];
      let invitationMessages = await mailbox(email);
      expect(invitationMessages).toHaveLength(1);
      expect(invitationMessages[0]!.subject).toBe("Set up your FoxesGear account");
      const { data: profiles } = await service
        .from("profiles")
        .select("id")
        .eq("full_name", "Disposable QA User");
      testUserId = profiles![0]!.id;
      expect(
        (
          await adminApi.patch("/api/admin/users", {
            headers: { Origin: baseURL },
            data: { action: "resend-invitation", userId: testUserId },
          })
        ).status(),
      ).toBe(429);
      await service
        .from("profiles")
        .update({ invitation_attempted_at: new Date(Date.now() - 61000).toISOString() })
        .eq("id", testUserId);
      await page
        .getByRole("button", { name: "Resend invitation to Disposable QA User", exact: true })
        .click();
      await expect.poll(async () => (await mailbox(email)).length).toBe(2);
      // A provider failure is shown honestly and does not create another account.
      await service
        .from("profiles")
        .update({ invitation_attempted_at: new Date(Date.now() - 61000).toISOString() })
        .eq("id", testUserId);
      await page.request.post(`${mailMock}/fail-next`);
      await page
        .getByRole("button", { name: "Resend invitation to Disposable QA User", exact: true })
        .click();
      await expect(
        page.getByRole("alert").filter({ hasText: "The account is saved" }),
      ).toContainText(email);
      await expect(
        page.getByRole("table").getByText("Email failed — resend needed", { exact: true }),
      ).toBeVisible();
      expect((await mailbox(email)).length).toBe(2);
      await service
        .from("profiles")
        .update({ invitation_attempted_at: new Date(Date.now() - 61000).toISOString() })
        .eq("id", testUserId);
      await page
        .getByRole("button", { name: "Resend invitation to Disposable QA User", exact: true })
        .click();
      await expect.poll(async () => (await mailbox(email)).length).toBe(3);

      invitationMessages = await mailbox(email);
      const setupLink = invitationMessages[2]!.text.match(
        /https?:\/\/[^\s]+\/reset-password\?[^\s]+/,
      )![0];
      const target = new URL(setupLink);
      const localLink = baseURL + target.pathname + target.search;
      await page.context().clearCookies();
      await page.goto(localLink);
      await expect(page.getByRole("button", { name: "Save password" })).toBeEnabled();
      const password = "Disposable-QA-strong-password-2026!";
      await page.getByLabel("New password", { exact: true }).fill(password);
      await page.getByLabel("Confirm password", { exact: true }).fill(password);
      // A temporary provider outage must not prevent the user from saving their password.
      await page.request.post(`${mailMock}/fail-next`);
      await page.getByRole("button", { name: "Save password" }).click();
      await expect(page.getByText("Password saved.", { exact: false })).toBeVisible();
      await page.goto("/login");
      await page.getByLabel("Email", { exact: true }).fill(email);
      await page.getByLabel("Password", { exact: true }).fill(password);
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await expect(page).toHaveURL(/login\?reason=denied/);
      expect((await page.request.get("/api/admin/users")).status()).toBe(403);
      const setup = await service
        .from("profiles")
        .select("setup_complete,setup_completed_at")
        .eq("id", testUserId)
        .single();
      expect(setup.data?.setup_complete).toBe(true);
      expect(setup.data?.setup_completed_at).toBeTruthy();
      expect(
        (await mailbox("jasonmacpei@hotmail.com")).filter((m) => m.text.includes(email)),
      ).toHaveLength(0);
      expect(
        (
          await page.request.post("/api/account/setup-completed", { headers: { Origin: baseURL } })
        ).status(),
      ).toBe(200);
      let notices = (await mailbox("jasonmacpei@hotmail.com")).filter((m) =>
        m.text.includes(email),
      );
      expect(notices).toHaveLength(1);
      expect(notices[0]!.text).toContain("Atlantic time");
      await page.request.post("/api/account/setup-completed", { headers: { Origin: baseURL } });
      notices = (await mailbox("jasonmacpei@hotmail.com")).filter((m) => m.text.includes(email));
      expect(notices).toHaveLength(1);
      const crossSite = await adminApi.patch("/api/admin/users", {
        headers: { Origin: "https://untrusted.example" },
        data: { action: "access", userId: testUserId, isAdmin: true, disabled: false },
      });
      expect(crossSite.status()).toBe(403);
      const users = await (await adminApi.get("/api/admin/users")).json();
      expect(
        (
          await adminApi.patch("/api/admin/users", {
            headers: { Origin: baseURL },
            data: { action: "access", userId: users.currentUserId, isAdmin: false, disabled: true },
          })
        ).status(),
      ).toBe(400);
      expect(
        (
          await adminApi.patch("/api/admin/users", {
            headers: { Origin: baseURL },
            data: { action: "access", userId: testUserId, isAdmin: true, disabled: false },
          })
        ).status(),
      ).toBe(200);
      // Store admins retain product tools, but user management belongs only to the owner.
      expect((await page.request.get("/api/admin/users")).status()).toBe(403);
      expect(
        (
          await page.request.post("/api/admin/users", {
            headers: { Origin: baseURL },
            data: { email: `blocked-${email}`, fullName: "Blocked user", isAdmin: true },
          })
        ).status(),
      ).toBe(403);
      for (const data of [
        { action: "access", userId: users.currentUserId, isAdmin: false, disabled: true },
        { action: "access", userId: testUserId, isAdmin: false, disabled: true },
        { action: "resend-invitation", userId: users.currentUserId },
      ])
        expect(
          (
            await page.request.patch("/api/admin/users", { headers: { Origin: baseURL }, data })
          ).status(),
        ).toBe(403);
      await page.goto("/admin/products/new");
      await expect(page.getByRole("heading", { name: "New product", exact: true })).toBeVisible();
      await expect(page.getByRole("link", { name: "Users", exact: true })).toHaveCount(0);
      await page.goto("/admin/users");
      await expect(page).toHaveURL(/\/admin\?reason=owner-only/);
      await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
      expect(
        (
          await adminApi.patch("/api/admin/users", {
            headers: { Origin: baseURL },
            data: { action: "access", userId: testUserId, isAdmin: false, disabled: true },
          })
        ).status(),
      ).toBe(200);
      expect([401, 403]).toContain((await page.request.get("/api/admin/users")).status());
    } finally {
      if (!testUserId) {
        const { data } = await service.auth.admin.listUsers({ perPage: 1000 });
        testUserId = data.users.find((u) => u.email === email)?.id || "";
      }
      if (testUserId) {
        const { error } = await service.auth.admin.deleteUser(testUserId);
        if (error) throw error;
      }
      await adminApi.dispose();
    }
  });
});
