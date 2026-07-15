import { describe, it, expect, vi } from "vitest";
import { renderTemplate } from "../lib/reminders/email-templates";

describe("Email templates rendering and fallbacks", () => {
  it("renders variables and produces HTML & text versions", () => {
    const vars = {
      ownerName: "Alice Smith",
      petName: "Buddy",
      vaccineName: "Rabies",
      nextDueDate: "25 Jul 2026",
      daysUntilDue: 10,
    };

    const res = renderTemplate("vaccination_due_soon", vars);

    expect(res.active).toBe(true);
    // Plain text check
    expect(res.text).toContain("Hello Alice Smith");
    expect(res.text).toContain("Buddy's Rabies is due on 25 Jul 2026");

    // HTML check
    expect(res.html).toContain("Hello <strong style=\"color:#0F172A;\">Alice Smith</strong>");
    expect(res.html).toContain("Buddy");
    expect(res.html).toContain("Rabies");
  });

  it("handles missing optional values without breaking", () => {
    const vars = {
      ownerName: "Bob",
      // petName is missing
      vaccineName: "Parvovirus",
    };

    const res = renderTemplate("vaccination_due_soon", vars);

    expect(res.active).toBe(true);
    expect(res.text).toContain("Hello Bob");
    // Missing variables should render as empty strings rather than undefined
    expect(res.text).toContain("'s Parvovirus is due");
    expect(res.html).toContain("Hello <strong style=\"color:#0F172A;\">Bob</strong>");
  });

  it("escapes user input HTML in HTML body to prevent XSS but allows raw variables", () => {
    const vars = {
      ownerName: "<script>alert('xss')</script> & User",
      petName: "<b>Buddy</b>",
      petPhotoBlock: "<div><img src='buddy.jpg'/></div>", // RAW variable
    };

    const res = renderTemplate("birthday", vars);

    // ownerName and petName should be escaped
    expect(res.html).toContain("&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt; &amp; User");
    expect(res.html).toContain("&lt;b&gt;Buddy&lt;/b&gt;");

    // petPhotoBlock should NOT be escaped
    expect(res.html).toContain("<div><img src='buddy.jpg'/></div>");

    // Check plain text does not escape html characters
    expect(res.text).toContain("<script>alert('xss')</script> & User");
  });

  it("respects active/disabled template settings and falls back to defaults", () => {
    const overrides = {
      birthday: {
        is_active: false,
        subject: "Custom Subject for {{petName}}",
      },
    };

    const resDisabled = renderTemplate("birthday", { petName: "Max" }, overrides);
    expect(resDisabled.active).toBe(false);
    expect(resDisabled.subject).toBe("Custom Subject for Max");

    // If html_body is blank in override, fall back to default
    expect(resDisabled.html).toContain("celebrating a birthday");
  });
});
