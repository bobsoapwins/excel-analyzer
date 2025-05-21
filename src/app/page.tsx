
"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { read, utils as xlsxUtils } from 'xlsx';
import FileUpload from '@/components/FileUpload';
import DataTable, { type ColumnPercentageData } from '@/components/DataTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

// This function processes the Excel file.
// It's defined outside the component because it doesn't need component props or state.
const processExcelFile = (file: File): Promise<ColumnPercentageData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const arrayBuffer = event.target?.result;
        if (!arrayBuffer) {
          reject(new Error("Failed to read file."));
          return;
        }

        const workbook = read(arrayBuffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          resolve([]); // No sheets found
          return;
        }

        const worksheet = workbook.Sheets[firstSheetName];
        let jsonData = xlsxUtils.sheet_to_json<any[]>(worksheet, { header: 1, defval: null });

        if (jsonData.length === 0) {
          resolve([]); // Sheet is empty
          return;
        }
        
        let headers: string[];
        let dataStartIndex = 1; 

        // Try to determine if the first row is headers or data
        if (jsonData.length > 0 && Array.isArray(jsonData[0])) {
            const firstRow = jsonData[0] as any[];
            // Heuristic: if a significant portion of the first row looks like numbers, or it has no non-empty strings and there's more data, assume no headers
            const looksLikeData = firstRow.some(cell => cell !== null && cell !== undefined && !isNaN(parseFloat(String(cell).replace(/,/g, ''))));
            const hasNonEmptyString = firstRow.some(cell => typeof cell === 'string' && cell.trim() !== '');

            if (looksLikeData || (!hasNonEmptyString && jsonData.length > 1)) { 
                // If first row looks like data or is all empty/null and there are more rows, assume no explicit headers
                const numCols = jsonData.reduce((max, row) => Math.max(max, (row || []).length), 0);
                headers = Array.from({ length: numCols }, (_, i) => `Unnamed Column ${i + 1}`);
                dataStartIndex = 0; // Start processing data from the first row
            } else {
                // Assume first row is headers
                headers = (jsonData[0] as any[]).map((h, i) => (h === null || String(h).trim() === '') ? `Unnamed Column ${i + 1}` : String(h));
            }
        } else {
            // Not enough data to determine headers or process
            resolve([]);
            return;
        }
        
        // If headers were taken from row 0, but that was the ONLY row, then there's no data.
        if (dataStartIndex === 1 && jsonData.length === 1) { 
            resolve([]);
            return;
        }


        const columnDataList: ColumnPercentageData[] = headers.map((header, colIndex) => {
          const numericValuesInColumn: number[] = [];
          for (let rowIndex = dataStartIndex; rowIndex < jsonData.length; rowIndex++) {
            const row = jsonData[rowIndex];
            if (row && colIndex < row.length) {
              const cellValue = row[colIndex];
              // Check if cellValue is not null, not undefined, and not an empty string
              if (cellValue !== null && cellValue !== undefined && String(cellValue).trim() !== '') {
                const cleanedCellValue = String(cellValue).replace(/,/g, ''); // Remove commas for parsing
                const num = parseFloat(cleanedCellValue);
                if (!isNaN(num)) {
                  numericValuesInColumn.push(num);
                }
              }
            }
          }

          let calculatedPercentage: number | null = null;
          let notesMessage: string = '';

          if (numericValuesInColumn.length < 2) {
            calculatedPercentage = null; 
            notesMessage = 'Needs at least two numeric values for comparison.';
            if (numericValuesInColumn.length === 1) {
                 notesMessage = `Only one numeric value (${numericValuesInColumn[0]}) found.`;
            }
          } else {
            const firstNum = numericValuesInColumn[0];
            const lastNum = numericValuesInColumn[numericValuesInColumn.length - 1];

            if (firstNum === 0) {
              if (lastNum === 0) {
                calculatedPercentage = 0; // 0% change
                notesMessage = 'Change from 0 to 0.';
              } else {
                calculatedPercentage = lastNum > 0 ? Infinity : -Infinity;
                notesMessage = `Change from 0 to ${lastNum}. Percentage is effectively infinite.`;
              }
            } else {
              calculatedPercentage = (lastNum - firstNum) / Math.abs(firstNum); // Percentage change
              notesMessage = `Change from ${firstNum} to ${lastNum}.`;
            }
          }
          
          return {
            columnName: String(header || `Unnamed Column ${colIndex + 1}`), // Ensure columnName is always a string
            percentageValue: calculatedPercentage,
            notes: notesMessage,
          };
        });

        resolve(columnDataList);

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
  const columnInsightsRef = useRef<HTMLDivElement>(null);

  const handleFileSelect = useCallback(async (file: File) => {
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
      if (data.length > 0) {
        toast({
          title: "File Processed Successfully!",
          description: `${file.name} has been analyzed.`,
        });
      } else {
         toast({
          title: "File Processed",
          description: `${file.name} was processed, but no data columns were found or it was empty.`,
          variant: "default",
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during file processing.";
      setError(errorMessage);
      setParsedData([]); 
      toast({
        title: "Processing Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]); 

  useEffect(() => {
    if (parsedData.length > 0 && columnInsightsRef.current) {
      columnInsightsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [parsedData]);

  return (
    <div className="flex flex-col items-center p-4 md:p-8 selection:bg-primary/20 selection:text-primary">
      <header className="mb-8 text-center">
        
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          Excel Insights
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Designed for CAZ Energy Audits LLC and related businesses
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
          <Card ref={columnInsightsRef} className="shadow-xl rounded-xl overflow-hidden">
            <CardHeader className="bg-card/50">
              <CardTitle className="text-xl">Column Insights</CardTitle>
              <CardDescription>
                {currentFile ? (
                  <>
                    Analysis results for <span className="font-semibold text-foreground">{currentFile.name}</span>: Percentage change from first to last numeric value.
                  </>
                ) : "Percentage values for each column."}
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
                    <p className="text-muted-foreground">No column insights could be generated for {currentFile.name}. The file might be empty, not contain processable numeric data in columns, or the first sheet is blank.</p>
                </CardContent>
            </Card>
        )}
      </main>

      <footer className="mt-16 py-8 text-center text-sm text-muted-foreground">
        <p>&copy;2025 Neo Incorporated Data Analysis Department. All rights reserved</p>
        <p className="text-xs mt-1">
          Powered by <span className="font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">NeoAI</span>
        </p>
      </footer>
    </div>
  );
}
