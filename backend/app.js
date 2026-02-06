import dotenv from "dotenv";
dotenv.config();
import express from "express";
import morgan from "morgan";
import connectDB from "./db/db.js";
import userRouter from "./routes/user.routes.js";
import projectRouter from "./routes/project.routes.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import aiRoutes from './routes/ai.routes.js'

connectDB();

const app = express();
app.use(cors());

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/users", userRouter);
app.use("/projects", projectRouter);
app.use("/ai",aiRoutes)



app.get("/", (req, res) => {
  res.send("Hello World!");
});
export default app;
