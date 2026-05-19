
"use client";

import React, { useState, useRef } from 'react';
import type { ChangeEvent, DragEvent, FC } from 'react';
// Button component is no longer used
import { Input } from '@/components/ui/input';
import { UploadCloud, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
  disabled?: boolean;
}

const FileUpload: FC<FileUploadProps> = ({ onFileSelect, isLoading, disabled = false }) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDisabled = isLoading || disabled;

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
      // Reset file input to allow uploading the same file again if needed
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(false);
    const file = event.dataTransfer.files?.[0]; // Get the first dropped file
    if (file) {
      onFileSelect(file);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault(); // This is crucial to allow the drop event
    event.stopPropagation();
    if (!isDisabled) { // Only set dragging state if not already loading
        setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleClick = () => {
    if (!isDisabled) {
        fileInputRef.current?.click();
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div
        className={cn(
          "w-full border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center transition-colors",
          isDisabled
            ? "opacity-50 pointer-events-none cursor-not-allowed"
            : "cursor-pointer hover:border-primary",
          isDraggingOver && !isDisabled ? "border-primary bg-accent/10" : "border-border"
        )}
        onDrop={!isDisabled ? handleDrop : undefined}
        onDragOver={!isDisabled ? handleDragOver : undefined}
        onDragLeave={!isDisabled ? handleDragLeave : undefined}
        onClick={handleClick}
        role="button"
        tabIndex={isDisabled ? -1 : 0}
        aria-label="File upload area"
        aria-disabled={isDisabled}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-2" />
            <p className="text-muted-foreground text-center">Processing...</p>
          </>
        ) : (
          <>
            <UploadCloud className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-muted-foreground text-center">
              {isDraggingOver ? "Drop the file here" : "Drag & drop or click to upload"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">.xlsx files</p>
          </>
        )}
        <Input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          disabled={isDisabled}
        />
      </div>
      {/* The Button component has been removed from here */}
    </div>
  );
};

export default FileUpload;
