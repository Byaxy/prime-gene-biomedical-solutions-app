// FileUploader.tsx
"use client";

import Image from "next/image";
import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { convertFileToUrl } from "@/lib/utils";
import { CloudUpload, FileText, File } from "lucide-react";
import { X } from "lucide-react";

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
    "application/pdf": [".pdf"],
    "application/msword": [".doc"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
      ".docx",
    ],
  },
  maxFiles = 1,
  maxSize = 10 * 1024 * 1024,
  disabled = false,
}: FileUploaderProps) => {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (maxFiles === 1) {
        onChange(acceptedFiles.slice(0, 1));
      } else {
        const newFiles = [...(files || []), ...acceptedFiles].slice(
          0,
          maxFiles
        );
        onChange(newFiles);
      }
    },
    [onChange, files, maxFiles]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    maxSize,
    disabled,
  });

  const removeFile = (index: number) => {
    const newFiles = [...(files || [])];
    newFiles.splice(index, 1);
    onChange(newFiles);
  };

  const getFileIcon = (file: File) => {
    if (file.type.includes("pdf")) {
      return <FileText className="h-6 w-6 text-red-500" />;
    } else if (
      file.type.includes("word") ||
      file.name.endsWith(".doc") ||
      file.name.endsWith(".docx")
    ) {
      return <File className="h-6 w-6 text-blue-500" />;
    } else if (file.type.includes("image")) {
      return null;
    }
    return <File className="h-6 w-6 text-gray-500" />;
  };

  const showCurrentImage = mode === "edit" && currentImageUrl && !files?.length;
  const showUploadedFiles = files && files.length > 0;
  const isExcelUpload =
    accept &&
    Object.keys(accept).some(
      (key) => key.includes("spreadsheetml") || key.includes("excel")
    );
  const isDocumentUpload =
    accept &&
    Object.keys(accept).some(
      (key) =>
        key.includes("pdf") ||
        key.includes("wordprocessingml") ||
        key.includes("msword")
    );

  const getFileTypeDescription = () => {
    if (isExcelUpload) return "Excel files (.xlsx, .xls)";
    if (isDocumentUpload) return "PDF or Word documents (.pdf, .doc, .docx)";
    return "SVG, PNG, JPG or GIF (max. 800x400px)";
  };

  return (
    <div {...getRootProps()} className="file-upload">
      <input {...getInputProps()} />
      {isExcelUpload && (
        <div className="p-4 bg-green-50 rounded-md">
          <p className="text-green-800 font-medium">
            {files?.[0]?.name} ready for upload
          </p>
        </div>
      )}
      {showUploadedFiles ? (
        files.length === 1 && files[0].type.includes("image") ? (
          // Single image preview (existing behavior)
          <div className="flex flex-col items-center justify-center space-y-3">
            <Image
              src={convertFileToUrl(files[0])}
              width={150}
              height={150}
              alt="uploaded image"
              className="max-h-[400px] lg:w-[400px] overflow-hidden object-cover rounded-md"
            />
            <p className="text-14-regular text-blue-800">
              Click to change file
            </p>
          </div>
        ) : (
          // Multiple files or non-image upload
          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="relative flex items-center gap-3 p-3 bg-gray-50 rounded-md"
              >
                {getFileIcon(file)}
                {file.type.includes("image") ? (
                  <Image
                    src={convertFileToUrl(file)}
                    width={50}
                    height={50}
                    alt="uploaded image"
                    className="h-12 w-12 object-cover rounded-md"
                  />
                ) : null}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  className="text-gray-500 hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <p className="text-14-regular text-blue-800">
              Click to add more files
            </p>
          </div>
        )
      ) : showCurrentImage ? (
        // Existing image in edit mode (existing behavior)
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
        // Default upload prompt (existing styling)
        <>
          <CloudUpload className="h-10 w-10 text-green-200" />
          <div className="file-upload_label">
            <p className="text-14-regular">
              <span className="text-blue-800">Click to upload </span>
              or drag and drop
            </p>
            <p className="text-12-regular">
              {getFileTypeDescription()} (max. {maxSize / 1024 / 1024} MB)
            </p>
          </div>
        </>
      )}
    </div>
  );
};
