// MUST MOCK UUID BEFORE REQUIRING CONTROLLER
jest.mock("uuid", () => ({
  v4: () => "test-token"
}));

// Mock ALL clientModel functions before loading controller
jest.mock("../models/clientModel", () => ({
  getPendingBooking: jest.fn(),
  getEventByName: jest.fn(),
  purchaseTicket: jest.fn(),
  deletePendingBooking: jest.fn(),
}));

const {
  getPendingBooking,
  getEventByName,
  purchaseTicket,
  deletePendingBooking
} = require("../models/clientModel");

const { confirmBooking } = require("../controllers/clientController");

describe("confirmBooking()", () => {
  test("invalid token returns 400", () => {
    getPendingBooking.mockImplementation((t, cb) => cb(null, null));

    const req = { body: { token: "badtoken" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    confirmBooking(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("valid token completes booking", () => {
    getPendingBooking.mockImplementation((t, cb) =>
      cb(null, { event_name: "Jazz Night", tickets: 2 })
    );

    getEventByName.mockImplementation((name, cb) =>
      cb(null, { id: 1 })
    );

    purchaseTicket.mockImplementation((id, qty, cb) =>
      cb(null, { success: true })
    );

    deletePendingBooking.mockImplementation((t, cb) => cb(null));

    const req = { body: { token: "test-token" } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

    confirmBooking(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });
});
