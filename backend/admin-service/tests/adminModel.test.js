const adminModel = require("../models/adminModel");
const db = require("../models/db");

beforeAll(done => {
  db.serialize(() => {
    db.run("DELETE FROM events", done);
  });
});

afterAll(done => {
  db.close(() => done());
});

describe("Admin Model", () => {
  test("createEvent inserts event & returns id", done => {
    adminModel.createEvent(
      { name: "Test Event", date: "2025-01-01", total_tickets: 10 },
      (err, result) => {
        expect(err).toBeNull();
        expect(result).toHaveProperty("id");
        done();
      }
    );
  });

  test("getEvents returns array", done => {
    adminModel.getEvents((err, rows) => {
      expect(err).toBeNull();
      expect(Array.isArray(rows)).toBe(true);
      expect(rows.length).toBeGreaterThan(0);
      done();
    });
  });
});
