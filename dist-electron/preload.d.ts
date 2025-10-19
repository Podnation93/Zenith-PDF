declare global {
    interface Window {
        electronAPI: {
            auth: {
                register: (credentials: {
                    email: string;
                    password: string;
                    firstName?: string;
                    lastName?: string;
                }) => Promise<any>;
                login: (credentials: {
                    email: string;
                    password: string;
                }) => Promise<any>;
                verify: (token: string) => Promise<any>;
            };
            documents: {
                list: (userId: string) => Promise<any>;
                upload: (userId: string, filePath: string, fileName: string) => Promise<any>;
                get: (documentId: string) => Promise<any>;
                delete: (documentId: string, userId: string) => Promise<any>;
                selectFile: () => Promise<any>;
            };
            annotations: {
                list: (documentId: string) => Promise<any>;
                create: (documentId: string, userId: string, annotation: any) => Promise<any>;
                update: (annotationId: string, updates: any) => Promise<any>;
                delete: (annotationId: string, userId: string) => Promise<any>;
            };
            comments: {
                list: (annotationId: string) => Promise<any>;
                create: (annotationId: string, userId: string, content: string) => Promise<any>;
                resolve: (commentId: string) => Promise<any>;
            };
            activities: {
                list: (documentId: string) => Promise<any>;
            };
            app: {
                getVersion: () => Promise<string>;
                getPath: (name: 'userData' | 'documents') => Promise<string>;
            };
        };
    }
}
export {};
//# sourceMappingURL=preload.d.ts.map