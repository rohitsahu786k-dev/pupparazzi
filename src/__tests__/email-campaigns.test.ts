import { describe, expect, it } from "vitest";
import { campaignCapacity, isDeliverableCustomerEmail } from "../lib/email-campaigns";

describe("email activation campaign quota safety", () => {
  it("reserves 50 provider emails before applying the campaign cap", () => {
    expect(campaignCapacity({ providerAvailableCapacity: 150, reservedQuota: 50, dailyCap: 500, remainingEligible: 700 })).toBe(100);
    expect(campaignCapacity({ providerAvailableCapacity: 750, reservedQuota: 50, dailyCap: 1000, remainingEligible: 700 })).toBe(700);
  });

  it("sends no campaign mail when available quota is at or below reserve", () => {
    expect(campaignCapacity({ providerAvailableCapacity: 50, reservedQuota: 50, dailyCap: 100, remainingEligible: 700 })).toBe(0);
    expect(campaignCapacity({ providerAvailableCapacity: 20, reservedQuota: 50, dailyCap: 100, remainingEligible: 700 })).toBe(0);
  });

  it("honors configured campaign daily cap and remaining recipients", () => {
    expect(campaignCapacity({ providerAvailableCapacity: 750, reservedQuota: 50, dailyCap: 100, remainingEligible: 700 })).toBe(100);
    expect(campaignCapacity({ providerAvailableCapacity: 750, reservedQuota: 50, dailyCap: 100, remainingEligible: 12 })).toBe(12);
  });

  it("excludes placeholder and invalid customer emails", () => {
    expect(isDeliverableCustomerEmail("client-123@client.local")).toBe(false);
    expect(isDeliverableCustomerEmail("not-an-email")).toBe(false);
    expect(isDeliverableCustomerEmail("customer@example.com")).toBe(true);
  });
});
