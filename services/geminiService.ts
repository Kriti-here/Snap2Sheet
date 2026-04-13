
import { GoogleGenAI, Type } from "@google/genai";
import { TableData } from "../types";

/**
 * Extraction of tabular data from an image.
 * Uses Gemini 3 Flash Preview for high reliability and broad availability.
 * This model is optimized for vision tasks and helps avoid 404/NOT_FOUND errors
 * that occur when a specific model version is not available in a region.
 */
export const convertImageToData = async (base64Image: string): Promise<TableData> => {
  // Initialize with the provided API key from environment
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Task: Extract tabular data from the provided image.
    Rules:
    1. Scan the entire image for tables, grids, or structured lists.
    2. Map the spatial layout exactly into a 2D array.
    3. Include all headers and data cells.
    4. If a cell is blank or unreadable, represent it as an empty string ("").
    5. Return ONLY a valid JSON object matching the requested schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType: "image/png" } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rows: {
              type: Type.ARRAY,
              description: "A 2D array of rows, where each row contains an array of string cell values.",
              items: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            }
          },
          required: ["rows"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("The AI returned an empty response. Ensure the image is clear and contains a visible table.");
    }

    let result;
    try {
      result = JSON.parse(text);
    } catch (parseError) {
      console.error("JSON Parsing Error:", text);
      throw new Error("Received a malformed response from the AI. Please try a clearer screenshot.");
    }
    
    if (!result.rows || !Array.isArray(result.rows) || result.rows.length === 0) {
      throw new Error("No tabular data could be detected in this image.");
    }

    // Post-processing: Normalize rows to ensure a perfect rectangular grid
    const maxCols = Math.max(...result.rows.map((r: any) => Array.isArray(r) ? r.length : 0), 0);
    const normalizedRows = result.rows.map((row: any) => {
      const rowArr = Array.isArray(row) ? row : [];
      const cleanedRow = [...rowArr].map(cell => (cell === null || cell === undefined) ? "" : String(cell));
      while (cleanedRow.length < maxCols) cleanedRow.push("");
      return cleanedRow;
    });

    return normalizedRows;
  } catch (error: any) {
    console.error("Gemini Table Extraction Error:", error);
    
    // Map specific technical failures to user-friendly advice
    const errorMsg = error.message?.toLowerCase() || "";
    
    if (errorMsg.includes("not found") || errorMsg.includes("404")) {
      throw new Error("The requested AI model is currently unavailable. Please try again in a few moments or try a different image.");
    }

    const isRpcError = errorMsg.includes("xhr") || errorMsg.includes("500") || errorMsg.includes("rpc failed");
    if (isRpcError) {
      throw new Error("The AI server experienced a temporary bottleneck. Please try cropping the image or reducing its resolution slightly.");
    }
    
    throw new Error(error.message || "Failed to extract table data. Please ensure your image is clear and try again.");
  }
};
