import React, { useState, useRef } from "react";
import axios from "axios";

const OCRGoogleCloud: React.FC = () => {
  const [image, setImage] = useState<File | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [extractedInfo, setExtractedInfo] = useState<{
    name: string;
    gender: string;
    address: string;
    phone: string;
    birthdate: string;
  }>({
    name: "Not found",
    gender: "Not found",
    address: "Not found",
    phone: "Not found",
    birthdate: "Not found",
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Handle image file upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setImage(event.target.files[0]);
    }
  };

  // Open the camera and request permissions
  const openCamera = async () => {
    try {
      setIsCameraOpen(true);
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }, // Use the rear camera on mobile
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } else {
        throw new Error("Camera not supported on this device.");
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError(
        "Camera access was denied or is not supported on this device. Please check your browser settings."
      );
      setIsCameraOpen(false);
    }
  };

  // Capture image from the camera
  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (context) {
        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

        // Convert canvas data to a Blob and set it as the image
        canvas.toBlob((blob) => {
          if (blob) {
            const capturedImage = new File([blob], "captured-image.jpg", {
              type: "image/jpeg",
            });
            setImage(capturedImage);
            setIsCameraOpen(false);

            // Stop the camera
            const tracks = (video.srcObject as MediaStream).getTracks();
            tracks.forEach((track) => track.stop());
          }
        }, "image/jpeg");
      }
    }
  };

  // Handle OCR processing
  const handleOCR = async () => {
    if (!image) {
      alert("Please select or capture an image first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", image);

    try {
      const response = await axios.post(
        "http://localhost:5000/api/ocr", // Ensure this endpoint returns the OCR text
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const ocrText = response.data.text; // The OCR result text

      setText(ocrText); // Display the OCR result
      setError(null); // Reset any previous errors

      // Process OCR text line by line
      const lines = ocrText.split("\n");
      const extractedData = {
        name: "Not found",
        gender: "Not found",
        address: "Not found",
        phone: "Not found",
        birthdate: "Not found",
      };

      // Iterate over each line to find key information
      lines.forEach((line) => {
        // Gender detection with checked box (✓)
        if (line.includes("✓")) {
          if (line.includes("Male")) {
            extractedData.gender = "Male"; // If the checkmark is next to "Male", it's Male
          } else if (line.includes("Female")) {
            extractedData.gender = "Female"; // If the checkmark is next to "Female", it's Female
          }
        }

        // Name detection - we assume the name is the first block (before "gender" or "address")
        if (line.toLowerCase().includes("name:") || line.includes(",")) {
          const name = line.replace(/,/g, "").trim(); // Removing commas for cleaner extraction
          if (name) extractedData.name = name;
        }

        // Address detection - address contains street-like patterns
        if (line.match(/\d{1,5}\s+[A-Za-z]+\s+[A-Za-z]+/)) {
          extractedData.address = line.trim();
        }

        // Match for phone number (common phone number patterns)
        if (line.match(/(?:\d{10}|\(\d{3}\)\s?\d{3}[-.\s]?\d{4})/)) {
          extractedData.phone = line.trim();
        }

        // Match for birthdate (assuming a common date format like "31 AUG 2013")
        if (line.match(/\d{1,2}\s+[A-Za-z]+\s+\d{4}/)) {
          extractedData.birthdate = line.trim();
        }
      });

      setExtractedInfo(extractedData); // Store the extracted data
    } catch (error) {
      console.error("Error during OCR request:", error);
      setError("Error processing image. Please try again.");
    }
  };

  return (
    <div>
      <h1>OCR with Google Cloud Vision</h1>

      <div>
        <h3>Upload or Capture an Image:</h3>
        <input type="file" onChange={handleImageUpload} />
        <button onClick={openCamera}>Capture Image</button>
      </div>

      {isCameraOpen && (
        <div>
          <h3>Camera</h3>
          <video
            ref={videoRef}
            style={{ width: "100%" }}
            autoPlay
            muted
            playsInline
          />
          <canvas ref={canvasRef} style={{ display: "none" }} />
          <button onClick={captureImage}>Capture Photo</button>
        </div>
      )}

      <button onClick={handleOCR} disabled={!image}>
        Process Image
      </button>

      {error && <div style={{ color: "red" }}>{error}</div>}
      {text && (
        <div>
          <h3>OCR Result:</h3>
          <pre>{text}</pre>
          <h3>Extracted Information:</h3>
          <ul>
            <li>
              <strong>Name:</strong> {extractedInfo.name}
            </li>
            <li>
              <strong>Gender:</strong> {extractedInfo.gender}
            </li>
            <li>
              <strong>Address:</strong> {extractedInfo.address}
            </li>
            <li>
              <strong>Phone:</strong> {extractedInfo.phone}
            </li>
            <li>
              <strong>Birthdate:</strong> {extractedInfo.birthdate}
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default OCRGoogleCloud;
