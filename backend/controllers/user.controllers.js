import userModel from "../models/user.models.js";
import { validationResult } from "express-validator";
import { createUser, getAllUsers } from "../services/user.services.js";
import redisClient from "../services/redis.service.js";


export const createUserController = async (req, res) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    return res.status(400).json({ error: error.array() });
  }
  console.log(error);

  try {
    const user = await createUser(req.body);
    const token = user.generateAuthToken();
    delete user._doc.password;
    res.status(201).json({ user, token });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const loginUserController = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { email, password } = req.body;
  try {
    const user = await userModel.findOne({ email }).select("+password");
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid Credetial" });
    }
    const token = user.generateAuthToken();
    res.status(200).json({ user, token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getProfileController = async (req, res) => {
  console.log(req.user);
  res.status(200).json({ user: req.user });
};

export const logoutUserController = async (req, res) => {
  try {
    const token =
      req.cookies.token || req.header("Authorization").split(" ")[1];
    if (!token) {
      return res.status(400).json({ message: "No token provided" });
    }
    redisClient.set(token, "logout", "EX", 24 * 60 * 60);
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getAllUsersController = async (req, res) => {
  try {
    const loggedInUser = await userModel.findOne({ email: req.user.email });
    const users = await getAllUsers({ userId: loggedInUser._id });
   return res.status(200).json({ users });
  } catch (err) {
    console.log(err);
    res.status(400).json({ message: err.message });
  }
};
