import { query } from "../config/db.js";

export const getUsers = async (_req, res, next) => {
  try {
    const { rows } = await query(
      "SELECT id, name, email, role, is_active FROM signature_app.users"
    );
    res.json(rows);
  } catch (e) {
    next(e);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    console.log(
      `Updating user ${id} with is_active=${is_active}, admin_id=${req.user?.id}`
    );
    if (!id) {
      throw new Error("User ID is missing in request parameters");
    }
    const adminId = req.user?.id || "";
    // safer than string interpolation; sets GUC for audit trigger
    await query("SELECT set_config('app.current_user_id', $1, true)", [
      adminId,
    ]);

    const { rows } = await query(
      "UPDATE signature_app.users SET is_active = $1 WHERE id = $2 RETURNING id, name, email, role, is_active",
      [is_active, id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!is_active) {
      console.log(`Attempting to blacklist token for user ${id}`);
      try {
        const { rows: user } = await query(
          "SELECT current_token FROM signature_app.users WHERE id = $1",
          [id]
        );
        console.log(`User token data for ${id}:`, user);
        if (user.length > 0 && user[0].current_token) {
          const { rows: blacklisted } = await query(
            "INSERT INTO signature_app.token_blacklist (token, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL '1 hour') RETURNING *",
            [user[0].current_token, id]
          );
          console.log(`Blacklisted rows for user ${id}:`, blacklisted);
        } else {
          console.log(
            `No current_token found for user ${id}, skipping blacklist`
          );
        }
      } catch (blacklistError) {
        console.error(
          `Failed to blacklist token for user ${id}:`,
          blacklistError
        );
      }
    }

    res.json(rows[0]);
  } catch (e) {
    console.error(`Error in updateUser for ${req.params.id}:`, e);
    next(e);
  } finally {
    // reset the GUC regardless of outcome
    await query("RESET app.current_user_id");
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log(`Deleting user ${id}, admin_id=${req.user?.id}`);
    if (!id) {
      throw new Error("User ID is missing in request parameters");
    }
    const adminId = req.user?.id || "";
    await query("SELECT set_config('app.current_user_id', $1, true)", [
      adminId,
    ]);

    const { rows: userRows } = await query(
      "SELECT email FROM signature_app.users WHERE id = $1",
      [id]
    );
    if (userRows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    await query("DELETE FROM signature_app.users WHERE id = $1", [id]);
    res.json({ message: "User deleted successfully" });
  } catch (e) {
    console.error(`Error in deleteUser for ${req.params.id}:`, e);
    next(e);
  } finally {
    await query("RESET app.current_user_id");
  }
};

export const logAdminModeSwitch = async (req, res, next) => {
  try {
    const userId = req.user.id;
    console.log(`Logging admin mode switch for user ${userId}`);
    await query("SELECT signature_app.log_admin_mode_switch($1)", [userId]);
    res.json({ message: "Admin mode switch logged" });
  } catch (e) {
    next(e);
  }
};
