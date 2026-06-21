import { useEffect } from "react";

export type UploadQueueControls = {
  cancelRemainingUploads: () => void;
  cancelUpload: (id: string) => void;
  cancelUploadsInFolderAndWait: (folderPath: string) => Promise<void>;
  closePanel: () => void;
  enqueueUploadFiles: (files: FileList | File[]) => Promise<void>;
  minimizePanel: () => void;
  restorePanel: () => void;
  retryUpload: (id: string) => void;
};

let activeUploadQueueControls: UploadQueueControls | null = null;

function getActiveUploadQueueControls(): UploadQueueControls | null {
  return activeUploadQueueControls;
}

function registerUploadQueueControls(controls: UploadQueueControls): () => void {
  activeUploadQueueControls = controls;
  return () => {
    if (activeUploadQueueControls === controls) {
      activeUploadQueueControls = null;
    }
  };
}

export function useUploadQueueControlsRegistration(controls: UploadQueueControls): void {
  useEffect(() => registerUploadQueueControls(controls), [controls]);
}

export function enqueueDashboardUploadFiles(files: FileList | File[]) {
  return getActiveUploadQueueControls()?.enqueueUploadFiles(files) ?? Promise.resolve();
}

export function cancelDashboardUpload(id: string) {
  getActiveUploadQueueControls()?.cancelUpload(id);
}

export function retryDashboardUpload(id: string) {
  getActiveUploadQueueControls()?.retryUpload(id);
}

export function cancelRemainingDashboardUploads() {
  getActiveUploadQueueControls()?.cancelRemainingUploads();
}

export function minimizeDashboardUploadPanel() {
  getActiveUploadQueueControls()?.minimizePanel();
}

export function restoreDashboardUploadPanel() {
  getActiveUploadQueueControls()?.restorePanel();
}

export function closeDashboardUploadPanel() {
  getActiveUploadQueueControls()?.closePanel();
}

export function cancelDashboardUploadsInFolderAndWait(folderPath: string) {
  return (
    getActiveUploadQueueControls()?.cancelUploadsInFolderAndWait(folderPath) ?? Promise.resolve()
  );
}
