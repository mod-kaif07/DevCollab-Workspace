import http from "http";
import app from "./app.js";
import dotenv from "dotenv";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import ProjectModel from "./models/project.model.js";
import { generateResult } from "./services/ai.service.js";

dotenv.config();

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.use(async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(" ")[1];

    const projectId = socket.handshake.query.projectId;

    if (!projectId) {
      return next(new Error("Project ID required"));
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return next(new Error("Invalid project ID"));
    }

    const project = await ProjectModel.findById(projectId);

    if (!project) {
      return next(new Error("Project not found"));
    }

    socket.project = project;

    if (!token) {
      return next(new Error("Authentication error"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    socket.user = decoded;

    next();
  } catch (error) {
    next(error);
  }
});

io.on("connection", (socket) => {
  if (!socket.project) {
    socket.disconnect();
    return;
  }

  const roomId = socket.project._id.toString();

  socket.join(roomId);

  // ⭐ CHANGE 2: Updated message handler with AI support and better error handling
  socket.on("project-message", async (data) => {
    const message = data.message;
    const aiPresentInMessage = message.includes("@ai");
    
    if (aiPresentInMessage) {
      // Send typing indicator
      io.to(roomId).emit("project-message", {
        message: "AI is thinking...",
        sender: "ai",
        senderEmail: "AI",
        isTyping: true,
      });

      try {
        const prompt = message.replace("@ai", "").trim();
        
        if (!prompt) {
          io.to(roomId).emit("project-message", {
            message: "Please provide a question or prompt for the AI.",
            sender: "ai",
            senderEmail: "AI",
          });
          return;
        }

        const result = await generateResult(prompt);

        // Send AI response
        io.to(roomId).emit("project-message", {
          message: result,
          sender: "ai",
          senderEmail: "AI",
        });
        
      } catch (error) {
        let errorMessage = "Sorry, I'm having trouble processing your request right now.";
        
        if (error.status === 503) {
          errorMessage = "The AI service is currently overloaded. Please try again in a moment.";
        } else if (error.status === 429) {
          errorMessage = "Too many requests. Please wait a moment before trying again.";
        }

        io.to(roomId).emit("project-message", {
          message: errorMessage,
          sender: "ai",
          senderEmail: "AI",
          isError: true,
        });
      }
      
      return;
    }
    
    // Regular message - broadcast to all users in room
    socket.broadcast.to(roomId).emit("project-message", data);
  });

  socket.on("disconnect", () => {
    socket.leave(roomId);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});