const express = require("express");
const path = require("path");
const fs = require("fs");
const csvParser = require("csv-parser");

const app = express();
app.use(express.json());

const sharedDirectory = process.env.SHARED_VOLUME_PATH || "../";
const CONTAINER_2_URL = process.env.CONTAINER_2_URL || "http://localhost:6001";
const PORT = process.env.PORT || 6000;
// Store file API
app.post("/store-file", (req, res) => {
  const { file, data } = req.body;

  // Validate input
  if (!file) {
    return res.status(400).json({ file: null, error: "Invalid JSON input." });
  }

  if (!data) {
    return res
      .status(400)
      .json({ file: file, error: "Data is required to store the file." });
  }

  const filePath = path.join(sharedDirectory, file);

  // Write the file to the shared volume
  fs.writeFile(filePath, data, (err) => {
    if (err) {
      return res.status(500).json({
        file: file,
        error: "Error while storing the file to the storage.",
      });
    }
    return res.status(200).json({ file: file, message: "Success." });
  });
});
app.post("/calculate", async (req, res) => {
  const { file, product } = req.body;

  // Validate input
  if (!file) {
    return res.status(400).json({ file: null, error: "Invalid JSON input." });
  }

  const filePath = path.join(sharedDirectory, file);

  // Check if the file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ file, error: "File not found." });
  }

  // Validate the CSV format
  const readStream = fs.createReadStream(filePath);
  let isValidCsv = true;

  readStream.pipe(csvParser({ separator: "," })).on("error", () => {
    isValidCsv = false;
    readStream.destroy(); // Stop reading further on error
    return res
      .status(400)
      .json({ file, error: "Input file not in CSV format." });
  });

  try {
    const response = await fetch(`${CONTAINER_2_URL}/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file, product }),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({
      error: "Error communicating with Container 2.",
      details: err.message,
    });
  }
});

app.listen(PORT, () => {
  console.log("Container 1 running on port 6000.");
});
