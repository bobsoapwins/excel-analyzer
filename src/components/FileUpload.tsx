
"use client";

import React, { useState, useRef } from 'react';
import type { ChangeEvent, DragEvent, FC } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UploadCloud, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
}

const FileUpload: FC<FileUploadProps> = ({ onFileSelect, isLoading }) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (!isLoading) { // Only set dragging state if not already loading
        setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleClick = () => {
    if (!isLoading) {
        fileInputRef.current?.click();
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div
        className={cn(
          "w-full border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center transition-colors",
          isLoading
            ? "opacity-50 pointer-events-none cursor-not-allowed"
            : "cursor-pointer hover:border-primary",
          isDraggingOver && !isLoading ? "border-primary bg-accent/10" : "border-border"
        )}
        onDrop={!isLoading ? handleDrop : undefined}
        onDragOver={!isLoading ? handleDragOver : undefined}
        onDragLeave={!isLoading ? handleDragLeave : undefined}
        onClick={handleClick}
        role="button"
        tabIndex={isLoading ? -1 : 0}
        aria-label="File upload area"
        aria-disabled={isLoading}
      >
        <UploadCloud className="h-12 w-12 text-muted-foreground mb-2" />
        <p className="text-muted-foreground text-center">
          {isDraggingOver && !isLoading ? "Drop the file here" : "Drag & drop or click to upload"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">.xls or .xlsx files</p>
        <Input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          disabled={isLoading}
        />
      </div>
      <Button
        onClick={handleClick}
        disabled={isLoading}
        className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto"
        aria-label="Upload Excel file"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          "Select File"
        )}
      </Button>
    </div>
  );
};

export default FileUpload;
