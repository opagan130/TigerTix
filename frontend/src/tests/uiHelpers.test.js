const {
  formatEventDate,
  decrementTickets,
  purchaseMessage,
  setUser
} = require("../utils/uiHelpers");

describe("UI Helper Functions", () => {

  test("formats dates correctly", () => {
    const result = formatEventDate("2025-01-01");
    expect(result.length).toBeGreaterThan(0); // date string
  });

  test("decrements event ticket count", () => {
    const events = [
      { id: 1, available_tickets: 5 },
      { id: 2, available_tickets: 10 }
    ];

    const updated = decrementTickets(events, 1);

    const event1 = updated.find(e => e.id === 1);
    const event2 = updated.find(e => e.id === 2);

    expect(event1.available_tickets).toBe(4);
    expect(event2.available_tickets).toBe(10);
  });

  test("creates purchase success message", () => {
    expect(purchaseMessage("Jazz Night"))
      .toBe('Ticket purchased for "Jazz Night"');
  });

  test("setUser returns email", () => {
    expect(setUser("test@example.com")).toBe("test@example.com");
  });

});
