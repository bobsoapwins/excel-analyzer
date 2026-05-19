
"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import ExcelJS from 'exceljs';
import FileUpload from '@/components/FileUpload';
import DataTable, { type ColumnPercentageData } from '@/components/DataTable';
import TermsOfServiceModal from '@/components/TermsOfServiceModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// This function processes the Excel file.
// It's defined outside the component because it doesn't need component props or state.
const processExcelFile = (file: File): Promise<ColumnPercentageData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target?.result;
        if (!arrayBuffer) {
          reject(new Error("Failed to read file."));
          return;
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer as ArrayBuffer);
        const worksheet = workbook.worksheets[0];

        if (!worksheet) {
          resolve([]); // No sheets found
          return;
        }

        /**
         * Normalizes ExcelJS cell values into primitives so downstream parsing logic can
         * consistently treat worksheet rows as arrays of plain values.
         * @param cellValue Raw cell value from ExcelJS row.values.
         * @returns Primitive-like value derived from formula, rich text, text, or null.
         */
        const normalizeCellValue = (cellValue: unknown): unknown => {
          if (cellValue === undefined) return null;
          if (cellValue && typeof cellValue === 'object') {
            if ('result' in cellValue) {
              return (cellValue as { result?: unknown }).result ?? null;
            }
            if ('richText' in cellValue && Array.isArray((cellValue as { richText?: Array<{ text?: string }> }).richText)) {
              return ((cellValue as { richText: Array<{ text?: string }> }).richText)
                .map(part => part.text ?? '')
                .join('');
            }
            if ('text' in cellValue) return (cellValue as { text?: string }).text ?? null;
          }
          return cellValue;
        };

        const jsonData: any[][] = [];
        worksheet.eachRow({ includeEmpty: true }, (row) => {
          // ExcelJS row.values is 1-indexed, so index 0 is always empty.
          const rowValues = Array.isArray(row.values) ? row.values.slice(1) : [];
          jsonData.push(rowValues.map(normalizeCellValue));
        });

        if (jsonData.length === 0) {
          resolve([]); // Sheet is empty
          return;
        }
        
        let dataStartIndex = 0;
        // Check if the first row looks like a header or data.
        // This logic assumes headers are text and data might start with numbers.
        if (jsonData.length > 0 && Array.isArray(jsonData[0])) {
            const firstRow = jsonData[0];
            // Heuristic: if the first row contains numbers or is mostly empty but there are subsequent rows,
            // assume it's data and there are no headers.
            const looksLikeData = firstRow.some(cell => cell !== null && cell !== undefined && !isNaN(parseFloat(String(cell).replace(/,/g, ''))));
            const hasNonEmptyString = firstRow.some(cell => typeof cell === 'string' && cell.trim() !== '');

            if (looksLikeData || (!hasNonEmptyString && jsonData.length > 1)) {
                dataStartIndex = 0; // No headers, data starts at the first row
            } else {
                dataStartIndex = 1; // Headers present, data starts at the second row
            }
        } else {
            resolve([]); // Malformed sheet data
            return;
        }
        
        // If only a header row exists (or what was thought to be data was just one row)
        if (dataStartIndex === 1 && jsonData.length === 1) { 
            resolve([]); // No data rows to process
            return;
        }
        if (dataStartIndex === 0 && jsonData.length === 0) { // Should be caught by earlier check, but defensive
            resolve([]);
            return;
        }


        const rowDataList: ColumnPercentageData[] = [];

        const parseNumericCell = (cellValue: any): number | null => {
          if (cellValue === null || cellValue === undefined || String(cellValue).trim() === '') {
            return null;
          }
          const cleanedCellValue = String(cellValue).replace(/,/g, '');
          const num = parseFloat(cleanedCellValue);
          return isNaN(num) ? null : num;
        };

        for (let rowIndex = dataStartIndex; rowIndex < jsonData.length; rowIndex++) {
          const currentRow = jsonData[rowIndex];
          if (!currentRow || !Array.isArray(currentRow)) continue; // Skip if row is not an array

          const labelCell = currentRow[0]; // Column A for label
          const val1Cell = currentRow[1];  // Column B for first value
          const val2Cell = currentRow[3];  // Column D for second value

          const columnName = String(labelCell ?? `Row ${rowIndex + 1 - dataStartIndex}`).trim();
          
          const num1 = parseNumericCell(val1Cell);
          const num2 = parseNumericCell(val2Cell);

          let calculatedPercentage: number | null = null;
          let notesMessage: string = '';

          if (num1 === null || num2 === null) {
            calculatedPercentage = null;
            if (num1 === null && num2 === null) {
                notesMessage = 'Numeric values missing in both Column B and Column D.';
            } else if (num1 === null) {
                notesMessage = 'Numeric value missing in Column B.';
            } else { // num2 is null
                notesMessage = 'Numeric value missing in Column D.';
            }
          } else {
            if (num1 === 0) {
              if (num2 === 0) {
                calculatedPercentage = 0;
                notesMessage = `Change from ${num1} to ${num2}.`;
              } else {
                calculatedPercentage = num2 > 0 ? Infinity : -Infinity;
                notesMessage = `Change from ${num1} to ${num2}. Percentage is effectively infinite.`;
              }
            } else {
              calculatedPercentage = (num2 - num1) / Math.abs(num1);
              notesMessage = `Change from ${num1} to ${num2}.`;
            }
          }
          
          rowDataList.push({
            columnName: columnName,
            percentageValue: calculatedPercentage,
            notes: notesMessage,
          });
        }

        resolve(rowDataList);

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
  const resultsTableRef = useRef<HTMLDivElement>(null);

  const [tosAccepted, setTosAccepted] = useState(false);
  const [isTosModalOpen, setIsTosModalOpen] = useState(true); 
  const [isTosModalDismissed, setIsTosModalDismissed] = useState(false);

  const [animateHeader, setAnimateHeader] = useState(false);
  const [animateUploadCard, setAnimateUploadCard] = useState(false);
  const [animateResultsCard, setAnimateResultsCard] = useState(false);
  const [animateFooter, setAnimateFooter] = useState(false);

  useEffect(() => {
    if (isTosModalDismissed) {
      const timers = [
        setTimeout(() => setAnimateHeader(true), 100),
        setTimeout(() => setAnimateUploadCard(true), 250),
        setTimeout(() => setAnimateFooter(true), 550), 
      ];
      return () => timers.forEach(clearTimeout);
    }
  }, [isTosModalDismissed]);

  const handleAcceptTos = () => {
    setTosAccepted(true);
    setIsTosModalOpen(false);
    setIsTosModalDismissed(true);
  };

  const handleFileSelect = useCallback(async (file: File) => {
    if (!tosAccepted) {
        toast({
            title: "Terms of Service",
            description: "Please accept the Terms of Service before using the application.",
            variant: "destructive",
        });
        setIsTosModalOpen(true);
        return;
    }

    if (!file.type.includes('spreadsheetml') && !file.name.endsWith('.xlsx')) {
      setError("Invalid file type. Please upload an Excel file (.xlsx).");
      toast({
        title: "Invalid File Type",
        description: "Please upload an Excel file (.xlsx).",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setParsedData([]); 
    setCurrentFile(file);
    setAnimateResultsCard(false); 

    try {
      const data = await processExcelFile(file);
      setParsedData(data);
      if (data.length > 0) {
        setTimeout(() => {
          setAnimateResultsCard(true);
          if (resultsTableRef.current) {
            resultsTableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      } else {
         toast({
          title: "File Processed",
          description: `${file.name} was processed, but no data rows meeting the criteria (Column A for label, B & D for values) were found or it was empty.`,
          variant: "default",
          duration: 7000, 
          showProgressBar: true,
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
  }, [toast, tosAccepted]); 
  
  const mainContentVisible = tosAccepted || isTosModalDismissed;

  return (
    <div className="flex flex-col items-center p-4 md:p-8 selection:bg-primary/20 selection:text-primary">
      <header className={cn(
          "mb-8 text-center transition-all duration-500 ease-out",
          animateHeader ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
        )}>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          Excel Insights
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Exclusively for CAZ Energy Audits LLC and related subsidiaries
        </p>
      </header>

      {!isTosModalDismissed && <TermsOfServiceModal isOpen={isTosModalOpen} onAccept={handleAcceptTos} />}

      <main 
        className={cn(
            "w-full max-w-3xl space-y-8 transition-opacity duration-500",
            mainContentVisible ? "opacity-100" : "opacity-30 pointer-events-none"
        )}
      >
        <Card className={cn(
            "shadow-xl rounded-xl overflow-hidden transition-all duration-500 ease-out",
            animateUploadCard ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
          )}>
          <CardHeader className="bg-card/50">
            <CardTitle className="text-xl">Upload Your Spreadsheet</CardTitle>
            <CardDescription>Drag and drop an Excel document, or select one by clicking the box</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <FileUpload onFileSelect={handleFileSelect} isLoading={isLoading} disabled={!mainContentVisible}/>
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
          <Card 
            ref={resultsTableRef} 
            className={cn(
                "shadow-xl rounded-xl overflow-hidden transition-all duration-500 ease-out",
                 animateResultsCard ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
            )}
            style={{ animationDelay: animateUploadCard ? '150ms' : '0ms' }} 
          >
            <CardHeader className="bg-card/50">
              <CardTitle className="text-xl">Row Analysis</CardTitle>
              <CardDescription>
                {currentFile ? (
                  <>
                    Analysis results for <span className="font-semibold text-foreground">{currentFile.name}</span>: Percentage change from Column B to Column D for each row.
                  </>
                ) : "Percentage values for each row."}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 md:p-2"> 
              <DataTable data={parsedData} />
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && parsedData.length === 0 && currentFile && mainContentVisible && ( 
             <Card className="shadow-lg rounded-xl">
                <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">No processable rows found in {currentFile.name}. Ensure data exists in Column A (for label), Column B, and Column D for comparison.</p>
                </CardContent>
            </Card>
        )}
      </main>

      <footer className={cn(
          "mt-16 py-8 text-center text-sm text-muted-foreground transition-all duration-500 ease-out",
          animateFooter ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
        )}>
        <p>&copy;2025 Neo Incorporated. All rights reserved.</p>
        <p className="text-xs mt-1">
          Powered by <span className="font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">NeoAI</span>
        </p>
      </footer>
    </div>
  );
}
