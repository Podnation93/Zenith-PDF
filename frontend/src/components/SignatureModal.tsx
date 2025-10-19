import { useState, useRef } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  Button, Tabs, TabList, Tab, TabPanels, TabPanel, Input, HStack, Select, Box, VStack, useToast
} from '@chakra-ui/react';
import SignatureCanvas from 'react-signature-canvas';
import { useSignatureStore } from '../store/signature.store';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FONT_FAMILES = ['"Caveat", cursive', '"Dancing Script", cursive', '"Kalam", cursive'];

export function SignatureModal({ isOpen, onClose }: SignatureModalProps) {
  const { addSignature } = useSignatureStore();
  const toast = useToast();
  const [typedText, setTypedText] = useState('Your Name');
  const [selectedFont, setSelectedFont] = useState(FONT_FAMILES[0]);
  const drawCanvasRef = useRef<any>(null);

  const handleSaveSignature = () => {
    // This is a simplified save. In a real app, you might want to handle each tab's content.
    // For now, we'll just save the drawing canvas content.
    if (drawCanvasRef.current && !drawCanvasRef.current.isEmpty()) {
      const dataUrl = drawCanvasRef.current.toDataURL();
      addSignature(dataUrl);
      toast({ title: 'Signature saved!', status: 'success' });
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Create Your Signature</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Tabs>
            <TabList>
              <Tab>Type</Tab>
              <Tab>Draw</Tab>
              <Tab>Upload</Tab>
            </TabList>
            <TabPanels>
              <TabPanel>
                <VStack spacing={4}>
                  <Input 
                    value={typedText} 
                    onChange={(e) => setTypedText(e.target.value)} 
                    placeholder="Type your name"
                    fontFamily={selectedFont}
                    fontSize="2xl"
                  />
                  <Select value={selectedFont} onChange={(e) => setSelectedFont(e.target.value)}>
                    {FONT_FAMILES.map(font => <option key={font} value={font} style={{ fontFamily: font }}>{font.split(',')[0].replace(/"/g, '')}</option>)}
                  </Select>
                </VStack>
              </TabPanel>
              <TabPanel>
                <Box border="1px dashed gray" borderRadius="md">
                  <SignatureCanvas 
                    ref={drawCanvasRef} 
                    penColor='black'
                    canvasProps={{ width: 500, height: 200, className: 'sigCanvas' }}
                  />
                </Box>
                <Button size="sm" mt={2} onClick={() => drawCanvasRef.current?.clear()}>Clear</Button>
              </TabPanel>
              <TabPanel>
                <Input type="file" accept="image/*" />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>Cancel</Button>
          <Button colorScheme="blue" onClick={handleSaveSignature}>Save Signature</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
