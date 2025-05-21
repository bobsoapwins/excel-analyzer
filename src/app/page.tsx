
"use client";

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Logo from '@/components/Logo';
import FileUpload from '@/components/FileUpload';
import DataTable, { type ColumnPercentageData } from '@/components/DataTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

const processExcelFile = async (file: File): Promise<ColumnPercentageData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const arrayBuffer = event.target?.result;
        if (!arrayBuffer) {
          reject(new Error("Failed to read file."));
          return;
        }

        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          // If no sheets, resolve with empty array or reject, based on desired behavior
          // For this example, we'll treat it as "no data to process"
          resolve([]);
          return;
        }

        const worksheet = workbook.Sheets[firstSheetName];
        // header: 1 converts to array of arrays (rows of cells).
        // defval: null ensures empty cells are represented as null.
        const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: null });

        if (jsonData.length === 0) {
          resolve([]); // Empty sheet
          return;
        }

        const headers = jsonData[0] as string[];
        // If jsonData.length is 1, it means there's only a header row and no data rows.
        const numDataRows = jsonData.length > 1 ? jsonData.length - 1 : 0;


        if (headers.length === 0 && numDataRows === 0) {
            // Completely empty sheet (or sheet with one empty row interpreted as header)
            resolve([]);
            return;
        }
        
        if (numDataRows === 0) {
          // Only header row found
          resolve(headers.map((header, colIndex) => ({
            columnName: String(header || `Unnamed Column ${colIndex + 1}`),
            percentageValue: 0,
            notes: 'No data rows found'
          })));
          return;
        }
        
        const columnData: ColumnPercentageData[] = headers.map((header, colIndex) => {
          let nonEmptyCellCount = 0;
          // Iterate from row 1 (jsonData[1]) as jsonData[0] is the header.
          for (let rowIndex = 1; rowIndex < jsonData.length; rowIndex++) {
            const row = jsonData[rowIndex];
            // Check if row exists and cellValue exists for the current column index
            if (row && colIndex < row.length) {
                const cellValue = row[colIndex];
                if (cellValue !== null && cellValue !== undefined && String(cellValue).trim() !== '') {
                    nonEmptyCellCount++;
                }
            }
          }
          
          const percentage = numDataRows > 0 ? nonEmptyCellCount / numDataRows : 0;
          return {
            columnName: String(header || `Unnamed Column ${colIndex + 1}`),
            percentageValue: percentage,
            notes: 'Percentage of non-empty cells'
          };
        });

        resolve(columnData);

      } catch (e) {
        console.error("Error processing Excel file:", e);
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during parsing.";
        reject(new Error(`Failed to parse the Excel file. ${errorMessage}`));
      }
    };

    reader.onerror = (error) => {
      console.error("FileReader error:", error);
      reject(new Error("Error reading file."));
    };

    reader.readAsArrayBuffer(file);
  });
};


export default function HomePage() {
  const [parsedData, setParsedData] = useState<ColumnPercentageData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const { toast } = useToast();
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);


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
    setParsedData([]); 
    setCurrentFile(file);

    try {
      const data = await processExcelFile(file);
      setParsedData(data);
      if (data.length > 0) {
        toast({
          title: "File Processed Successfully!",
          description: `${file.name} has been analyzed.`,
        });
      } else {
         toast({
          title: "File Processed",
          description: `${file.name} was processed, but no data columns were found or it was empty.`,
          variant: "default" 
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during file processing.";
      setError(errorMessage);
      setParsedData([]); // Ensure data is cleared on error
      toast({
        title: "Processing Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  

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
            <CardContent className="p-0 md:p-2">
              <DataTable data={parsedData} />
            </CardContent>
          </Card>
        )}
        
        {!isLoading && !error && parsedData.length === 0 && currentFile && (
             <Card className="shadow-lg rounded-xl">
                <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">No column insights could be generated for {currentFile.name}. The file might be empty, contain no data rows, or the first sheet is blank.</p>
                </CardContent>
            </Card>
        )}

      </main>

      <footer className="mt-16 py-8 text-center text-sm text-muted-foreground">
        {currentYear && <p>&copy; {currentYear} Excel Insights. Powered by Next.js & ShadCN UI.</p>}
         <p className="text-xs mt-1">Designed for clarity and ease of use.</p>
      </footer>
    </div>
  );
}
