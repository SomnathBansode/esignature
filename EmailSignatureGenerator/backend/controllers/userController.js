// backend/controllers/userController.js

export const getUsers = async (_req, res, next) => {
  try {
    const { rows } = await query("SELECT * FROM signature_app.users");
    res.json(rows); // Send all users to the frontend
  } catch (e) {
    next(e);
  }
};
