
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, AlertCircle } from 'lucide-react';

const FileFormatGuide = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          File Format Guide
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
            <div>
              <h4 className="font-medium">Required Columns</h4>
              <p className="text-sm text-gray-600">
                Your CSV file must contain columns for: Date, Merchant/Store, and Amount
              </p>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Example CSV Format:</h4>
            <code className="text-sm">
              Date,Merchant,Amount,Category<br/>
              2024-01-15,Grocery Store,45.67,Food & Dining<br/>
              2024-01-16,Gas Station,35.00,Transportation
            </code>
          </div>
          
          <div className="text-sm text-gray-600">
            <p>• Date format: YYYY-MM-DD or MM/DD/YYYY</p>
            <p>• Amount should be numeric (without currency symbols)</p>
            <p>• Category is optional - you can edit categories in the review section</p>
            <p>• Setting a category for a merchant will automatically apply it to other expenses from the same merchant</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FileFormatGuide;
