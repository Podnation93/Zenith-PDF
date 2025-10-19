import { useEffect, useState } from 'react';
import { Box, Input, Checkbox } from '@chakra-ui/react';
import { PDFDocument, PDFTextField, PDFCheckBox } from 'pdf-lib';

interface FormLayerProps {
  pdfDoc: PDFDocument | null;
  pageNumber: number;
  scale: number;
}

export function FormLayer({ pdfDoc, pageNumber, scale }: FormLayerProps) {
  const [formFields, setFormFields] = useState<any[]>([]);

  useEffect(() => {
    const detectFields = async () => {
      if (!pdfDoc) return;

      const form = pdfDoc.getForm();
      const fields = form.getFields();
      const pageFields = fields.filter(field => {
        const acroField = field.acroField;
        // This is a simplified check. A real implementation would need to resolve widget annotations.
        // For now, we assume one widget per field and check the page number.
        return acroField.P === pageNumber - 1; 
      });

      setFormFields(pageFields);
    };

    detectFields();
  }, [pdfDoc, pageNumber]);

  if (!pdfDoc) return null;

  return (
    <Box position="absolute" top={0} left={0} right={0} bottom={0} pointerEvents="none">
      {formFields.map((field, index) => {
        const widget = field.acroField.getWidgets()[0];
        const rect = widget.getRectangle();
        const page = pdfDoc.getPage(pageNumber - 1);

        const position = {
          x: rect.x * scale,
          y: (page.getHeight() - rect.y - rect.height) * scale,
          width: rect.width * scale,
          height: rect.height * scale,
        };

        const commonProps = {
          key: index,
          position: 'absolute',
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${position.width}px`,
          height: `${position.height}px`,
          pointerEvents: 'auto' as 'auto',
        };

        if (field instanceof PDFTextField) {
          return (
            <Input
              {...commonProps}
              defaultValue={field.getText()}
              onChange={(e) => field.setText(e.target.value)}
              fontSize={`${position.height * 0.8}px`}
              p={0}
              border="1px solid blue"
            />
          );
        }

        if (field instanceof PDFCheckBox) {
          return (
            <Checkbox 
              {...commonProps} 
              isChecked={field.isChecked()}
              onChange={(e) => e.target.checked ? field.check() : field.uncheck()}
            />
          );
        }

        return null;
      })}
    </Box>
  );
}
