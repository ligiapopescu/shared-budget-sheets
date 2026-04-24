
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload } from 'lucide-react';

interface FileUploadDropzoneProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
}

const FileUploadDropzone = ({ onFileSelect, isProcessing }: FileUploadDropzoneProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Expense File</CardTitle>
        <CardDescription>Import expenses from a CSV file</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onDragEnter={() => setIsDragging(true)}
          onDragLeave={() => setIsDragging(false)}
        >
          <div className="flex flex-col items-center gap-4">
            <Upload className="w-12 h-12 text-gray-400" />
            <div>
              <p className="text-lg font-medium">
                {isProcessing ? 'Processing file...' : 'Drop your CSV file here'}
              </p>
              <p className="text-gray-500">or</p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileInput}
                className="hidden"
                id="file-upload"
                disabled={isProcessing}
              />
              <Button 
                asChild 
                variant="outline" 
                className="mt-2"
                disabled={isProcessing}
              >
                <label htmlFor="file-upload" className="cursor-pointer">
                  Choose File
                </label>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FileUploadDropzone;
