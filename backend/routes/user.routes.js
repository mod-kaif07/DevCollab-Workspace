import { Router } from "express";
import * as UserController from "../controllers/user.controllers.js";
import { body } from "express-validator";
import { authUser } from "../middleware/auth.middleware.js";

const router = Router();

router.post(
  "/register",
  body("email").isEmail().withMessage("Email must be valid"),
  body("password")
    .isLength({ min: 3 })
    .withMessage("Password must be at least 3 characters long"),
  UserController.createUserController,
);

router.post(
  "/login",
  body("email").isEmail().withMessage("Email must be valid"),
  body("password")
    .isLength({ min: 3 })
    .withMessage("Password must be at least 3 characters long"),
  UserController.loginUserController,
);

router.get("/profile", authUser, UserController.getProfileController);

router.get("/logout", authUser, UserController.logoutUserController);

router.get("/all", authUser, UserController.getAllUsersController);
export default router;
