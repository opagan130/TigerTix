const clientModel = require("../models/clientModel");
const db = require("../models/db");

beforeAll(done => {
  db.serialize(() => {
    db.run("DELETE FROM events", () => {
      db.run(
        `INSERT INTO events(name, date, total_tickets, available_tickets)
         VALUES('UnitTest', '2025-01-01', 5, 5)`,
        done
      );
    });
  });
});

afterAll(done => {
  db.close(() => done());
});

describe("Client Model", () => {
  test("getAllEvents returns array", done => {
    clientModel.getAllEvents((err, rows) => {
      expect(err).toBeNull();
      expect(Array.isArray(rows)).toBe(true);
      done();
    });
  });

  test("purchaseTicket decrements ticket count", done => {
    db.get(`SELECT id FROM events WHERE name='UnitTest'`, (err, row) => {
      expect(err).toBeNull();

      clientModel.purchaseTicket(row.id, (err2, result) => {
        expect(err2).toBeNull();
        expect(result).toEqual({ success: true });
        done();
      });
    });
  });
});
