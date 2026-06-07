/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { Camera, Image, RotateCw, AlertCircle, Check, RefreshCw } from 'lucide-react';

interface CameraCaptureProps {
  onPhotoCaptured: (dataUrl: string) => void;
  onClose: () => void;
}

const STOCK_CAR_PRESETS = [
  { name: 'Blue Electric', url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600&auto=format&fit=crop&q=80' },
  { name: 'Oxford White SUV', url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&auto=format&fit=crop&q=80' },
  { name: 'Silver Sedan', url: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&auto=format&fit=crop&q=80' },
  { name: 'Midnight Black Roadster', url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&auto=format&fit=crop&q=60' },
  { name: 'Red Sport Coupé', url: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&auto=format&fit=crop&q=80' }
];

export default function CameraCapture({ onPhotoCaptured, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [uploadOption, setUploadOption] = useState<'camera' | 'upload' | 'preset'>('preset');

  // Stop camera stream when component unmounts
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    setCapturedImage(null);
    try {
      if (streamRef.current) {
        stopCamera();
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      console.error('Error starting camera:', err);
      let errMsg = 'Could not access camera. Please check permissions or try file upload.';
      if (err.name === 'NotAllowedError') {
        errMsg = 'Camera permission denied. Please allow camera access or use preset/upload option.';
      } else if (err.name === 'NotFoundError') {
        errMsg = 'No camera device found on this system.';
      }
      setCameraError(errMsg);
      setUploadOption('preset'); // Auto redirect to stock presets
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw the current video frame on the canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedImage(dataUrl);
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setCapturedImage(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const selectPreset = (url: string) => {
    setCapturedImage(url);
  };

  const saveSelectedPhoto = () => {
    if (capturedImage) {
      onPhotoCaptured(capturedImage);
      onClose();
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xl max-w-lg w-full mx-auto" id="camera-capture-container">
      {/* Header */}
      <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50" id="camera-hdr">
        <div>
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-base">
            <Camera className="w-5 h-5 text-indigo-600" id="camera-icon-hdr" />
            Vehicle Photo Capture
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">Capture or upload an image of the car asset</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-sm"
          id="camera-close-btn"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 p-1 bg-gray-50 text-xs font-medium" id="camera-mode-tabs">
        <button
          onClick={() => {
            setUploadOption('preset');
            stopCamera();
          }}
          className={`flex-1 py-2.5 rounded-lg text-center transition-all ${
            uploadOption === 'preset'
              ? 'bg-white text-indigo-600 shadow-sm font-semibold'
              : 'text-gray-600 hover:text-gray-900'
          }`}
          id="btn-tab-preset"
        >
          Stock Presets (Recommended)
        </button>
        <button
          onClick={() => {
            setUploadOption('camera');
            startCamera();
          }}
          className={`flex-1 py-2.5 rounded-lg text-center transition-all ${
            uploadOption === 'camera'
              ? 'bg-white text-indigo-600 shadow-sm font-semibold'
              : 'text-gray-600 hover:text-gray-900'
          }`}
          id="btn-tab-camera"
        >
          Live Camera Capture
        </button>
        <button
          onClick={() => {
            setUploadOption('upload');
            stopCamera();
          }}
          className={`flex-1 py-2.5 rounded-lg text-center transition-all ${
            uploadOption === 'upload'
              ? 'bg-white text-indigo-600 shadow-sm font-semibold'
              : 'text-gray-600 hover:text-gray-900'
          }`}
          id="btn-tab-upload"
        >
          Upload Local File
        </button>
      </div>

      {/* Content Area */}
      <div className="p-6" id="camera-content-panel">
        
        {/* Presets Screen */}
        {uploadOption === 'preset' && (
          <div className="space-y-4" id="presets-screen">
            <p className="text-xs text-gray-600">Select an HD stock photo to represent the car model in the system:</p>
            <div className="grid grid-cols-2 gap-3" id="presets-grid">
              {STOCK_CAR_PRESETS.map((preset) => (
                <button
                  key={preset.url}
                  onClick={() => selectPreset(preset.url)}
                  className={`relative aspect-video rounded-xl overflow-hidden border-2 text-left group transition-all ${
                    capturedImage === preset.url
                      ? 'border-indigo-600 ring-2 ring-indigo-100'
                      : 'border-gray-100 hover:border-gray-300'
                  }`}
                  id={`preset-${preset.name.replace(/\s+/g, '-').toLowerCase()}`}
                  type="button"
                >
                  <img
                    src={preset.url}
                    alt={preset.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <p className="text-[10px] font-medium text-white line-clamp-1">{preset.name}</p>
                  </div>
                  {capturedImage === preset.url && (
                    <div className="absolute top-1 right-1 bg-indigo-600 text-white rounded-full p-1" id={`checked-${preset.name}`}>
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Live Camera Screen */}
        {uploadOption === 'camera' && (
          <div className="space-y-4" id="live-camera-screen">
            {cameraError && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl flex items-start gap-2.5 text-xs" id="camera-err-msg">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Webcam Unavailable</p>
                  <p className="mt-0.5">{cameraError}</p>
                </div>
              </div>
            )}

            {!capturedImage && !cameraError && (
              <div className="relative bg-black aspect-video rounded-xl overflow-hidden shadow-inner flex items-center justify-center group" id="camera-viewport-container">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                  id="camera-video-player"
                />
                
                {!cameraActive && (
                  <button
                    onClick={startCamera}
                    className="absolute bg-white/90 hover:bg-white text-gray-800 px-4 py-2 rounded-lg font-medium text-xs flex items-center gap-1.5 shadow-md transition-all scale-100 hover:scale-105"
                    id="btn-re-init-cam"
                    type="button"
                  >
                    <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin-slow" />
                    Initialize Camera Feed
                  </button>
                )}

                {cameraActive && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2" id="capture-trigger-overlay">
                    <button
                      onClick={capturePhoto}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-full font-semibold text-xs shadow-lg hover:shadow-indigo-500/20 flex items-center gap-2 transition-all hover:scale-105"
                      id="btn-snap-pic"
                      type="button"
                    >
                      <Camera className="w-4 h-4" />
                      Take Snapshot
                    </button>
                  </div>
                )}
              </div>
            )}

            {capturedImage && (
              <div className="space-y-2" id="camera-captured-prev-wrap">
                <p className="text-xs text-green-700 font-medium flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Captured snapshot successfully
                </p>
                <div className="relative aspect-video rounded-xl overflow-hidden border border-gray-100 shadow-sm" id="captured-img-frame">
                  <img src={capturedImage} alt="Captured asset" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="flex justify-end mt-2" id="btn-retake-photo-row">
                  <button
                    onClick={() => {
                      setCapturedImage(null);
                      startCamera();
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 py-1 px-2.5 hover:bg-indigo-50 rounded-lg transition-colors"
                    id="btn-retake-photo"
                    type="button"
                  >
                    <RotateCw className="w-3.5 h-3.5" /> Retake Snapshot
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upload Screen */}
        {uploadOption === 'upload' && (
          <div className="space-y-4" id="upload-local-screen">
            <div className="border-2 border-dashed border-gray-200 hover:border-indigo-400 rounded-xl p-8 text-center cursor-pointer transition-all bg-gray-50/50 hover:bg-indigo-50/10 relative" id="file-drop-zone">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                id="file-upload-input"
              />
              <div className="flex flex-col items-center justify-center space-y-2" id="file-upload-prompt">
                <div className="p-3 bg-white rounded-full shadow-sm border border-gray-100 text-gray-400">
                  <Image className="w-6 h-6 text-indigo-500" />
                </div>
                <div className="text-xs">
                  <span className="font-semibold text-indigo-600 hover:text-indigo-800">Click to upload</span> or drag and drop
                </div>
                <p className="text-[10px] text-gray-400">PNG, JPG, or WEBP up to 5MB</p>
              </div>
            </div>

            {capturedImage && (
              <div className="space-y-1.5" id="uploaded-preview-sec">
                <p className="text-[11px] font-medium text-gray-500">File Preview:</p>
                <div className="relative aspect-video rounded-xl overflow-hidden border border-gray-100 shadow-sm" id="uploaded-img-frame">
                  <img src={capturedImage} alt="Uploaded file preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Controls */}
        <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-between" id="camera-ctrl-foot">
          <div className="text-xs text-gray-400" id="photo-preview-desc">
            {capturedImage ? 'Ready to attach to car asset' : 'Please select/take a photo first'}
          </div>
          <div className="flex gap-2" id="camera-actions-row">
            <button
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              id="btn-cancel-capture"
              type="button"
            >
              Cancel
            </button>
            <button
              onClick={saveSelectedPhoto}
              disabled={!capturedImage}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                capturedImage
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-indigo-500/10 cursor-pointer'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              id="btn-confirm-capture"
              type="button"
            >
              <Check className="w-3.5 h-3.5" />
              Use This Image
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
