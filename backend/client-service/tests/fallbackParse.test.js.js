const { fallbackParse } = require("../controllers/clientController");

describe("fallbackParse()", () => {
  test("extracts event, tickets, and intent", () => {
    const result = fallbackParse("book 2 tickets for Jazz Night");

    expect(result.event).toBe("Jazz Night");
    expect(result.tickets).toBe(2);
    expect(result.intent).toBe("book");
  });

  test("returns null tickets/event for unrelated text", () => {
    const result = fallbackParse("I like turtles");

    expect(result.event).toBeFalsy();
    expect(result.tickets).toBeFalsy();
  });
});
