
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, AlertCircle, Calendar } from 'lucide-react';

interface ColumnMappingDialogProps {
  headers: string[];
  csvData: string[];
  onMappingComplete: (mapping: ColumnMapping, dateFormat: string) => void;
  onCancel: () => void;
}

export interface ColumnMapping {
  date: number;
  merchant: number;
  amount: number;
  currency?: number;
  category?: number;
}

const DATE_FORMATS = [
  { value: 'DD.MM.YYYY', label: 'DD.MM.YYYY (02.07.2025)', example: '02.07.2025' },
  { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY (02-07-2025)', example: '02-07-2025' },
  { value: 'MM-DD-YYYY', label: 'MM-DD-YYYY (07-02-2025)', example: '07-02-2025' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2025-07-02)', example: '2025-07-02' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (07/02/2025)', example: '07/02/2025' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (02/07/2025)', example: '02/07/2025' },
  { value: 'DD.MM.YYYY HH:mm', label: 'DD.MM.YYYY HH:mm (02.07.2025 12:30)', example: '02.07.2025 12:30' },
  { value: 'DD-MM-YYYY HH:mm', label: 'DD-MM-YYYY HH:mm (02-07-2025 12:30)', example: '02-07-2025 12:30' },
  { value: 'MM-DD-YYYY HH:mm', label: 'MM-DD-YYYY HH:mm (07-02-2025 12:30)', example: '07-02-2025 12:30' },
];

const ColumnMappingDialog = ({ headers, csvData, onMappingComplete, onCancel }: ColumnMappingDialogProps) => {
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>({});
  const [dateFormat, setDateFormat] = useState('');
  const [detectedDateSamples, setDetectedDateSamples] = useState<string[]>([]);
  const [columnExamples, setColumnExamples] = useState<string[]>([]);
  
  const requiredFields = ['date', 'merchant', 'amount'];
  const optionalFields = ['currency', 'category'];

  // Proper CSV parsing function that handles quoted values
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // Push the last field
    result.push(current.trim());
    return result;
  };

  // Extract first non-empty value for each column as an example
  useEffect(() => {
    const examples: string[] = [];
    headers.forEach((_, colIndex) => {
      let example = '';
      // Look through rows (skip header row at index 0) to find first non-empty value
      for (let i = 1; i < Math.min(csvData.length, 10); i++) {
        const values = parseCSVLine(csvData[i]);
        if (values[colIndex] && values[colIndex].trim() !== '') {
          example = values[colIndex].trim();
          break;
        }
      }
      examples.push(example);
    });
    setColumnExamples(examples);
  }, [headers, csvData]);
  
  const detectDateFormat = (dateColumn: number) => {
    const dateSamples: string[] = [];
    
    // Get first few date values from the CSV data (skip header at index 0)
    for (let i = 1; i < Math.min(csvData.length, 6); i++) {
      const values = parseCSVLine(csvData[i]);
      if (values[dateColumn]) {
        dateSamples.push(values[dateColumn]);
      }
    }
    
    setDetectedDateSamples(dateSamples);
    
    // Simple date format detection based on patterns
    if (dateSamples.length > 0) {
      const sample = dateSamples[0];
      
      if (sample.includes('.')) {
        if (sample.includes(':')) {
          setDateFormat('DD.MM.YYYY HH:mm');
        } else {
          setDateFormat('DD.MM.YYYY');
        }
      } else if (sample.includes('-')) {
        if (sample.includes(':')) {
          // Check if year is first (YYYY-MM-DD format)
          if (sample.split('-')[0].length === 4) {
            setDateFormat('YYYY-MM-DD');
          } else {
            // Assume DD-MM-YYYY for European style or MM-DD-YYYY for US style
            // Default to DD-MM-YYYY but user can change
            setDateFormat('DD-MM-YYYY HH:mm');
          }
        } else {
          if (sample.split('-')[0].length === 4) {
            setDateFormat('YYYY-MM-DD');
          } else {
            setDateFormat('DD-MM-YYYY');
          }
        }
      } else if (sample.includes('/')) {
        setDateFormat('MM/DD/YYYY'); // Default US format
      } else {
        setDateFormat('YYYY-MM-DD'); // Default fallback
      }
    }
  };
  
  const updateMapping = (field: keyof ColumnMapping, value: string) => {
    if (value === 'none') {
      setMapping(prev => {
        const newMapping = { ...prev };
        delete newMapping[field];
        return newMapping;
      });
    } else {
      const columnIndex = parseInt(value);
      setMapping(prev => ({
        ...prev,
        [field]: columnIndex
      }));
      
      // Auto-detect date format when date column is selected
      if (field === 'date') {
        detectDateFormat(columnIndex);
      }
    }
  };
  
  const isValid = requiredFields.every(field => 
    mapping[field as keyof ColumnMapping] !== undefined
  ) && dateFormat !== '';
  
  const getUsedColumns = () => {
    return Object.values(mapping).filter(val => val !== undefined);
  };
  
  const isColumnUsed = (index: number) => {
    return getUsedColumns().includes(index);
  };
  
  const handleConfirm = () => {
    if (isValid) {
      onMappingComplete(mapping as ColumnMapping, dateFormat);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-orange-500" />
          Column Mapping & Date Format Configuration
        </CardTitle>
        <CardDescription>
          We couldn't automatically detect all required columns. Please map the columns from your CSV file to the correct fields and confirm the date format.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Detected Columns:</h4>
          <div className="flex flex-wrap gap-2">
            {headers.map((header, index) => (
              <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                {index + 1}. {header}
              </span>
            ))}
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <span className="text-red-600">*</span>
              Required Fields
            </h4>
            <div className="grid gap-4">
              {requiredFields.map((field) => (
                <div key={field} className="flex items-center gap-4">
                  <Label className="w-20 capitalize">{field}:</Label>
                  <Select
                    value={mapping[field as keyof ColumnMapping]?.toString() || ''}
                    onValueChange={(value) => updateMapping(field as keyof ColumnMapping, value)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={`Select column for ${field}`}>
                        {mapping[field as keyof ColumnMapping] !== undefined && 
                          `${mapping[field as keyof ColumnMapping]! + 1}. ${headers[mapping[field as keyof ColumnMapping]!]}`
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {headers.map((header, index) => (
                        <SelectItem 
                          key={index} 
                          value={index.toString()}
                          disabled={isColumnUsed(index) && mapping[field as keyof ColumnMapping] !== index}
                        >
                          <div className="flex flex-col items-start">
                            <span>{index + 1}. {header}</span>
                            {columnExamples[index] && (
                              <span className="text-xs text-muted-foreground">
                                e.g. {columnExamples[index]}
                              </span>
                            )}
                          </div>
                          {isColumnUsed(index) && mapping[field as keyof ColumnMapping] !== index && ' (used)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {mapping[field as keyof ColumnMapping] !== undefined ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Date Format Section */}
          {mapping.date !== undefined && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span className="text-red-600">*</span>
                Date Format
              </h4>
              
              {detectedDateSamples.length > 0 && (
                <div className="bg-gray-50 p-3 rounded-lg mb-3">
                  <p className="text-sm text-gray-600 mb-2">Sample dates from your file:</p>
                  <div className="flex flex-wrap gap-2">
                    {detectedDateSamples.slice(0, 3).map((sample, index) => (
                      <span key={index} className="bg-gray-200 px-2 py-1 rounded text-sm font-mono">
                        {sample}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-4">
                <Label className="w-20">Format:</Label>
                <Select value={dateFormat} onValueChange={setDateFormat}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select date format" />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_FORMATS.map((format) => (
                      <SelectItem key={format.value} value={format.value}>
                        {format.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {dateFormat ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
              </div>
            </div>
          )}
          
          <div>
            <h4 className="font-medium mb-3">Optional Fields</h4>
            <div className="grid gap-4">
              {optionalFields.map((field) => (
                <div key={field} className="flex items-center gap-4">
                  <Label className="w-20 capitalize">{field}:</Label>
                  <Select
                    value={mapping[field as keyof ColumnMapping]?.toString() || 'none'}
                    onValueChange={(value) => updateMapping(field as keyof ColumnMapping, value)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={`Select column for ${field} (optional)`}>
                        {mapping[field as keyof ColumnMapping] !== undefined 
                          ? `${mapping[field as keyof ColumnMapping]! + 1}. ${headers[mapping[field as keyof ColumnMapping]!]}`
                          : 'None'
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {headers.map((header, index) => (
                        <SelectItem 
                          key={index} 
                          value={index.toString()}
                          disabled={isColumnUsed(index) && mapping[field as keyof ColumnMapping] !== index}
                        >
                          <div className="flex flex-col items-start">
                            <span>{index + 1}. {header}</span>
                            {columnExamples[index] && (
                              <span className="text-xs text-muted-foreground">
                                e.g. {columnExamples[index]}
                              </span>
                            )}
                          </div>
                          {isColumnUsed(index) && mapping[field as keyof ColumnMapping] !== index && ' (used)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-600">
            {isValid ? (
              <span className="text-green-600 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                All required fields mapped and date format selected
              </span>
            ) : (
              <span className="text-red-600 flex items-center gap-1">
                <XCircle className="w-4 h-4" />
                Please map all required fields and select date format
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={!isValid}>
              Continue with Mapping
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ColumnMappingDialog;
