import { Router } from "express";
import { body } from "express-validator";
import {
  createProjectcontroller,
  getAllProjectsController,
  addUserToProject,getprojectbyID,updateFileTree
} from "../controllers/project.controller.js";
import { authUser } from "../middleware/auth.middleware.js";

const router = Router();

router.post(
  "/create",
  authUser,
  body("name").notEmpty().withMessage("Project name is required"),
  createProjectcontroller,
);

router.get("/all", authUser, getAllProjectsController);

router.put(
  "/add-user",
  authUser,
  body("projectId").isString().withMessage("Project ID is required"),
  body("users")
    .isArray({ min: 1 })
    .withMessage("Users must be an array of strings")
    .bail()
    .custom((users) => users.every((user) => typeof user === "string"))
    .withMessage("Each user must be a string"),
  addUserToProject,
);


router.get("/get-project/:projectId", authUser, getprojectbyID);

router.put('/update-file-tree',
  authUser,
  body('projectId').isString().withMessage('Project ID is required'),
  body('fileTree').isObject().withMessage('File tree is required'),
  body('buildCommand').optional().isObject(),
  body('startCommand').optional().isObject(),
  updateFileTree
)
export default router;
