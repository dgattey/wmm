"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

const PendingUploadContext = createContext<{
  pendingFiles: File[] | null;
  setPendingFiles: (files: File[] | null) => void;
  takePendingFiles: () => File[] | null;
} | null>(null);

export function PendingUploadProvider({ children }: { children: React.ReactNode }) {
  const [pendingFiles, setPendingFilesState] = useState<File[] | null>(null);
  const pendingRef = useRef<File[] | null>(null);

  const setPendingFiles = useCallback((files: File[] | null) => {
    pendingRef.current = files;
    setPendingFilesState(files);
  }, []);

  const takePendingFiles = useCallback(() => {
    const files = pendingRef.current;
    pendingRef.current = null;
    setPendingFilesState(null);
    return files;
  }, []);

  return (
    <PendingUploadContext.Provider
      value={{ pendingFiles, setPendingFiles, takePendingFiles }}
    >
      {children}
    </PendingUploadContext.Provider>
  );
}

export function usePendingUpload() {
  const ctx = useContext(PendingUploadContext);
  if (!ctx) throw new Error("usePendingUpload must be used within PendingUploadProvider");
  return ctx;
}
