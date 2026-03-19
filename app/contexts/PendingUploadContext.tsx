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
  isProcessing: boolean;
  setProcessing: (value: boolean) => void;
} | null>(null);

export function PendingUploadProvider({ children }: { children: React.ReactNode }) {
  const [pendingFiles, setPendingFilesState] = useState<File[] | null>(null);
  const [isProcessing, setProcessing] = useState(false);
  const pendingRef = useRef<File[] | null>(null);

  const setPendingFiles = useCallback((files: File[] | null) => {
    pendingRef.current = files;
    setPendingFilesState(files);
  }, []);

  const takePendingFiles = useCallback(() => {
    const files = pendingRef.current;
    pendingRef.current = null;
    setPendingFilesState(null);
    if (files && files.length > 0) {
      setProcessing(true);
    }
    return files;
  }, []);

  return (
    <PendingUploadContext.Provider
      value={{
        pendingFiles,
        setPendingFiles,
        takePendingFiles,
        isProcessing,
        setProcessing,
      }}
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
