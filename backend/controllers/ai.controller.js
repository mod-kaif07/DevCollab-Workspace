import * as ai from "../services/ai.service.js"; // add .js if using ESM

export const getResult = async (req, res) => {
  try {
    const { prompt } = req.query;

    if (!prompt) {
      return res.status(400).json({ message: "prompt is required" });
    }

    const result = await ai.generateResult(prompt);
    res.json( result );
  } catch (err) {
    console.error("AI error:", err);
    res.status(500).json({ message: "Failed to generate result" });
  }
};
