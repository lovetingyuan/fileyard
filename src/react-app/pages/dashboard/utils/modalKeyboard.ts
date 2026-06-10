interface InputKeyConfirmOptions {
  key: string;
  isComposing: boolean;
}

export function shouldConfirmFromInputKey({ key, isComposing }: InputKeyConfirmOptions): boolean {
  return key === "Enter" && !isComposing;
}
