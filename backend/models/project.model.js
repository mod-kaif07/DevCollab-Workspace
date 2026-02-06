import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    lowercase: true,
  },
  user: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
  ],
  fileTree: {
    type: Object,
    default: {}
  },
  buildCommand: {
    type: Object,
    default: null
  },
  startCommand: {
    type: Object,
    default: null
  },
});

const Project = mongoose.model("project", projectSchema);
export default Project;