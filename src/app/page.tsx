"use client";

import type React from 'react';
import { useState } from 'react';
import Logo from '@/components/Logo';
import FileUpload from '@/components/FileUpload';
import DataTable, { type ColumnPercentageData } from '@/components/DataTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

// Mock parsing and calculation function
// In a real app, this would involve a library like 'xlsx' and actual data processing.
const processExcelFile = async (file: File): Promise<ColumnPercentageData[]> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Simulate reading file and processing
      console.log("Simulating processing for:", file.name);
      if (file.name.toLowerCase().includes("error")) {
        reject(new Error("Simulated error processing this file."));
        return;
      }

      // Mock data based on file type or name for demonstration
      const mockData: ColumnPercentageData[] = [
        { columnName: 'Column A (Numeric)', percentageValue: Math.random() * 0.8 + 0.1, notes: 'Randomly generated' },
        { columnName: 'Column B (Text)', percentageValue: Math.random() * 0.7 + 0.2, notes: 'Based on non-empty' },
        { columnName: 'Completion Status', percentageValue: Math.random() * 0.9 + 0.05, notes: '% tasks completed' },
        { columnName: `Data from ${file.name.substring(0,10)}...`, percentageValue: Math.random(), notes: 'Generic metric' },
      ];
      // Simulate some columns having no notes
      if (mockData.length > 2 && Math.random() > 0.5) mockData[1].notes = undefined;


      // Ensure at least one entry, at most 5 for demo
      resolve(mockData.slice(0, Math.floor(Math.random() * 3) + 2));
    }, 2000); // Simulate network/processing delay
  });
};


export default function HomePage() {
  const [parsedData, setParsedData] = useState<ColumnPercentageData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileSelect = async (file: File) => {
    if (!file.type.includes('spreadsheetml') && !file.type.includes('ms-excel') && !file.name.endsWith('.xls') && !file.name.endsWith('.xlsx')) {
      setError("Invalid file type. Please upload an Excel file (.xls or .xlsx).");
      toast({
        title: "Invalid File Type",
        description: "Please upload an Excel file (.xls or .xlsx).",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setParsedData([]); // Clear previous data
    setCurrentFile(file);

    try {
      const data = await processExcelFile(file);
      setParsedData(data);
      toast({
        title: "File Processed Successfully!",
        description: `${file.name} has been analyzed.`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during file processing.";
      setError(errorMessage);
      toast({
        title: "Processing Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const currentYear = new Date().getFullYear();

  return (
    <div className="flex flex-col items-center p-4 md:p-8 selection:bg-primary/20 selection:text-primary">
      <header className="mb-8 text-center">
        <Logo />
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          Excel Insights
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Upload your Excel file to instantly see column percentage insights.
        </p>
      </header>

      <main className="w-full max-w-3xl space-y-8">
        <Card className="shadow-xl rounded-xl overflow-hidden">
          <CardHeader className="bg-card/50">
            <CardTitle className="text-xl">Upload Your Spreadsheet</CardTitle>
            <CardDescription>Drag and drop your .xls or .xlsx file, or click to select.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <FileUpload onFileSelect={handleFileSelect} isLoading={isLoading} />
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive" className="shadow-lg rounded-lg">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Processing Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {isLoading && (
            <Card className="shadow-lg rounded-xl">
                <CardContent className="p-6 flex flex-col items-center justify-center min-h-[200px]">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p className="text-lg font-medium text-primary">Analyzing {currentFile?.name || 'your file'}...</p>
                    <p className="text-muted-foreground">Please wait a moment.</p>
                </CardContent>
            </Card>
        )}

        {!isLoading && parsedData.length > 0 && (
          <Card className="shadow-xl rounded-xl overflow-hidden">
            <CardHeader className="bg-card/50">
              <CardTitle className="text-xl">Column Insights</CardTitle>
              <CardDescription>
                {currentFile ? `Analysis results for ${currentFile.name}:` : "Percentage values for each column in your spreadsheet."}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 md:p-2"> {/* Remove padding for table to use full width */}
              <DataTable data={parsedData} />
            </CardContent>
          </Card>
        )}
        
        {!isLoading && !error && parsedData.length === 0 && currentFile && (
             <Card className="shadow-lg rounded-xl">
                <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">No specific column insights could be generated for {currentFile.name}. This might be a very small or empty file.</p>
                </CardContent>
            </Card>
        )}

      </main>

      <footer className="mt-16 py-8 text-center text-sm text-muted-foreground">
        <p>&copy; {currentYear} Excel Insights. Powered by Next.js & ShadCN UI.</p>
         <p className="text-xs mt-1">Designed for clarity and ease of use.</p>
      </footer>
    </div>
  );
}
