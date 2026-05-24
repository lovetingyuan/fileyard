import toast from "react-hot-toast";
import {
  getUploadSelectionValidationMessage,
  type UploadSelectionSource,
} from "../../utils/uploadSelection";
import { enqueueDashboardUploadFiles } from "./hooks/useUploadQueue";

type UploadDashboardFilesArgs = {
  files: FileList | File[];
  isFileMutationDisabled: boolean;
  source: UploadSelectionSource;
};

export async function uploadDashboardFiles({
  files,
  isFileMutationDisabled,
  source,
}: UploadDashboardFilesArgs): Promise<void> {
  const selectedFiles = Array.from(files);

  if (isFileMutationDisabled) {
    toast.error("Rename in progress, please wait");
    return;
  }

  const validationMessage = getUploadSelectionValidationMessage(selectedFiles, source);
  if (validationMessage) {
    toast.error(validationMessage);
    return;
  }

  if (selectedFiles.length === 0) {
    return;
  }

  await enqueueDashboardUploadFiles(selectedFiles);
}
