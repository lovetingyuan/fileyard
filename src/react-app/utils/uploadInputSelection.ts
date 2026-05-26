type FileInputSelectionTarget = {
  files: FileList | File[] | null;
  value: string;
};

export function takeFileInputSelection(input: FileInputSelectionTarget): File[] {
  const files = Array.from(input.files ?? []);
  input.value = "";
  return files;
}
