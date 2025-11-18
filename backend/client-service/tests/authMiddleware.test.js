const { verifyToken } = require("../middleware/authMiddleware");
const jwt = require("jsonwebtoken");

jest.mock("jsonwebtoken");

describe("Auth Middleware", () => {
  test("rejects when no token", () => {
    const req = { headers: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test("calls next when token is valid", () => {
    jwt.verify.mockImplementation((t, s, cb) => cb(null, { id: 123 }));

    const req = { headers: { authorization: "Bearer abc" } };
    const res = {};
    const next = jest.fn();

    verifyToken(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
