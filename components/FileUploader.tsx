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
  accept?: Record<string, string[]>;
  maxFiles?: number;
  maxSize?: number;
  disabled?: boolean;
};

export const FileUploader = ({
  files,
  onChange,
  mode = "create",
  currentImageUrl,
  accept = {
    "image/*": [".jpeg", ".jpg", ".png", ".gif", ".svg"],
  },
  maxFiles = 1,
  maxSize = 10 * 1024 * 1024,
  disabled = false,
}: FileUploaderProps) => {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onChange(acceptedFiles.slice(0, maxFiles));
    },
    [onChange, maxFiles]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    maxSize,
    disabled,
  });

  const showCurrentImage = mode === "edit" && currentImageUrl && !files?.length;
  const showUploadedImage = files && files.length > 0;
  const isExcelUpload =
    accept &&
    Object.keys(accept).some(
      (key) => key.includes("spreadsheetml") || key.includes("excel")
    );

  return (
    <>
      <div {...getRootProps()} className="file-upload">
        <input {...getInputProps()} />
        {showUploadedImage ? (
          <div className="flex flex-col items-center justify-center space-y-3">
            {isExcelUpload ? (
              <div className="p-4 bg-green-50 rounded-md">
                <p className="text-green-800 font-medium">
                  {files[0].name} ready for upload
                </p>
              </div>
            ) : (
              <Image
                src={convertFileToUrl(files[0])}
                width={150}
                height={150}
                alt="uploaded image"
                className="max-h-[400px] lg:w-[400px] overflow-hidden object-cover rounded-md"
              />
            )}
            <p className="text-14-regular text-blue-800">
              {isExcelUpload ? "Click to change file" : "Click to change image"}
            </p>
          </div>
        ) : showCurrentImage ? (
          <div className="flex flex-col items-center justify-center space-y-3">
            <Image
              src={currentImageUrl}
              width={150}
              height={150}
              alt="current image"
              className="max-h-[400px] lg:w-[400px] overflow-hidden object-cover"
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
                {isExcelUpload
                  ? "Excel files (.xlsx, .xls)"
                  : "SVG, PNG, JPG or GIF (max. 800x400px)"}
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
};
