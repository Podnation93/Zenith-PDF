import { create } from 'zustand';
import * as pdfjsLib from 'pdfjs-dist';

export interface SearchResult {
  pageNumber: number;
  match: string; // The text snippet of the match
  // We would also need position info to highlight, which requires more advanced text layer processing
}

interface SearchStoreState {
  query: string;
  results: SearchResult[];
  isSearching: boolean;
  activeResultIndex: number | null;
}

interface SearchStoreActions {
  setQuery: (query: string) => void;
  search: (pdfDoc: pdfjsLib.PDFDocumentProxy) => Promise<void>;
  clearSearch: () => void;
  setActiveResultIndex: (index: number | null) => void;
}

type SearchStore = SearchStoreState & SearchStoreActions;

export const useSearchStore = create<SearchStore>((set, get) => ({
  query: '',
  results: [],
  isSearching: false,
  activeResultIndex: null,

  setQuery: (query: string) => set({ query }),

export interface SearchResult {
  pageNumber: number;
  match: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// ...

  search: async (pdfDoc: pdfjsLib.PDFDocumentProxy) => {
    const { query } = get();
    if (!query || query.length < 3) {
      set({ results: [], isSearching: false });
      return;
    }

    set({ isSearching: true, results: [] });

    const numPages = pdfDoc.numPages;
    const allResults: SearchResult[] = [];

    for (let i = 1; i <= numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1 }); // Use scale 1 for original coords

      const pageText = textContent.items.map((item: any) => item.str).join('');
      const regex = new RegExp(query, 'gi');
      let match;

      while ((match = regex.exec(pageText)) !== null) {
        const startIndex = match.index;
        const endIndex = startIndex + match[0].length - 1;

        let startItem = -1, endItem = -1, currentLength = 0;
        for(let j=0; j<textContent.items.length; j++) {
            const itemLength = textContent.items[j].str.length;
            if(startItem === -1 && currentLength + itemLength >= startIndex) {
                startItem = j;
            }
            if(endItem === -1 && currentLength + itemLength >= endIndex) {
                endItem = j;
            }
            currentLength += itemLength;
            if(startItem !== -1 && endItem !== -1) break;
        }

        if (startItem !== -1 && endItem !== -1) {
            const firstItem = textContent.items[startItem] as any;
            const lastItem = textContent.items[endItem] as any;

            const x = firstItem.transform[4];
            const y = viewport.height - firstItem.transform[5] - firstItem.height;
            const width = (lastItem.transform[4] + lastItem.width) - x;
            const height = Math.max(firstItem.height, lastItem.height);

            allResults.push({
              pageNumber: i,
              match: match[0],
              position: { x, y, width, height },
            });
        }
      }
    }

    set({ results: allResults, isSearching: false });
  },


  clearSearch: () => set({ query: '', results: [], isSearching: false, activeResultIndex: null }),

  setActiveResultIndex: (index: number | null) => set({ activeResultIndex: index }),
}));
