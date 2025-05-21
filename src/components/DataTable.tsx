"use client";

import React from 'react';
import type { FC } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from '@/components/ui/table';
import { Progress } from "@/components/ui/progress";

export interface ColumnPercentageData {
  columnName: string;
  percentageValue: number; // Value between 0 and 1
  notes?: string;
}

interface DataTableProps {
  data: ColumnPercentageData[];
}

const DataTable: FC<DataTableProps> = ({ data }) => {
  if (data.length === 0) {
    // This case should ideally be handled by the parent component (HomePage)
    // to show a more contextual message (e.g., "No insights for your_file.xlsx")
    // However, keeping a fallback here.
    return <p className="p-4 text-center text-muted-foreground">No data to display. Process an Excel file to see insights.</p>;
  }

  return (
    <Table>
      <TableCaption>Calculated percentage values for each detected column.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[40%]">Column Name</TableHead>
          <TableHead className="w-[40%] text-center">Percentage Value</TableHead>
          <TableHead className="w-[20%] text-right">Notes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row, index) => (
          <TableRow key={index}>
            <TableCell className="font-medium">{row.columnName}</TableCell>
            <TableCell className="text-center">
              <div className="flex items-center justify-center">
                <Progress value={row.percentageValue * 100} className="w-3/4 h-3 mr-2" />
                <span>{(row.percentageValue * 100).toFixed(1)}%</span>
              </div>
            </TableCell>
            <TableCell className="text-right text-xs text-muted-foreground">{row.notes || '-'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default DataTable;
