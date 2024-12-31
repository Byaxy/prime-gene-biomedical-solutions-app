"use client";

import Image from "next/image";
import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { convertFileToUrl } from "@/lib/utils";
import { CloudUpload } from "lucide-react";

type FileUploaderProps = {
  files: File[] | undefined;
  onChange: (files: File[]) => void;
  mode?: "create" | "edit";
  currentImageUrl?: string;
};

export const FileUploader = ({
  files,
  onChange,
  mode = "create",
  currentImageUrl,
}: FileUploaderProps) => {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onChange(acceptedFiles);
    },
    [onChange]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif", ".svg"],
    },
  });

  const showCurrentImage = mode === "edit" && currentImageUrl && !files?.length;
  const showUploadedImage = files && files.length > 0;

  return (
    <div {...getRootProps()} className="file-upload">
      <input {...getInputProps()} />
      {showUploadedImage ? (
        <div className="flex flex-col items-center justify-center space-y-3">
          <Image
            src={convertFileToUrl(files[0])}
            width={80}
            height={80}
            alt="uploaded image"
            className="max-h-[80px] overflow-hidden object-cover rounded-md"
          />
          <p className="text-12-regular text-blue-800">Click to change image</p>
        </div>
      ) : showCurrentImage ? (
        <div className="flex flex-col items-center justify-center space-y-3">
          <Image
            src={currentImageUrl}
            width={100}
            height={100}
            alt="current image"
            className="max-h-[100px] overflow-hidden object-cover"
            priority={true}
          />
          <p className="text-12-regular mt-2 text-blue-800">
            Click to change image
          </p>
        </div>
      ) : (
        <>
          <CloudUpload className="h-10 w-10 text-green-200" />
          <div className="file-upload_label">
            <p className="text-14-regular">
              <span className="text-blue-800">Click to upload </span>
              or drag and drop
            </p>
            <p className="text-12-regular">
              SVG, PNG, JPG or GIF (max. 800x400px)
            </p>
          </div>
        </>
      )}
    </div>
  );
};
